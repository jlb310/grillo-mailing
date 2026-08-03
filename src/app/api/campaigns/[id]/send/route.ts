import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getResendClient } from "@/lib/resend"

const BATCH_SIZE = 20
const BATCH_DELAY_MS = 10000 // 10 segundos entre tandas

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        domain: true,
        contactList: {
          include: {
            members: {
              include: {
                contact: true,
              },
            },
          },
        },
        organization: true,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (!canAccessOrganization(session, campaign.organizationId)) {
      return NextResponse.json({ error: "No tienes acceso a esta campaña" }, { status: 403 })
    }

    if (campaign.status === "SENT" || campaign.status === "SENDING") {
      return NextResponse.json({ error: "Campaign already sent" }, { status: 400 })
    }

    if (!campaign.contactList || campaign.contactList.members.length === 0) {
      return NextResponse.json({ error: "No contacts in list" }, { status: 400 })
    }

    if (campaign.domain.status !== "VERIFIED") {
      return NextResponse.json({ error: "Domain not verified" }, { status: 400 })
    }

    // Update status to sending
    await prisma.campaign.update({
      where: { id },
      data: { status: "SENDING" },
    })

    const contacts = campaign.contactList.members
      .map((m) => m.contact)
      .filter((c) => !c.unsubscribed)

    if (contacts.length === 0) {
      await prisma.campaign.update({
        where: { id },
        data: { status: "FAILED" },
      })
      return NextResponse.json({ error: "No valid contacts to send" }, { status: 400 })
    }

    const totalContacts = contacts.length
    const batches = chunkArray(contacts, BATCH_SIZE)
    const results: { email: string; status: string; error?: string; id?: string }[] = []
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resend = await getResendClient(campaign.organizationId)

    // Enviar en tandas para no quemar el dominio
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const isFirst = batchIndex === 0

      // Esperar entre tandas (excepto la primera)
      if (!isFirst) {
        console.log(`[campaign ${id}] Esperando ${BATCH_DELAY_MS}ms antes de tanda ${batchIndex + 1}/${batches.length}`)
        await sleep(BATCH_DELAY_MS)
      }

      console.log(`[campaign ${id}] Enviando tanda ${batchIndex + 1}/${batches.length} (${batch.length} contactos)`)

      for (const contact of batch) {
        try {
          const personalizedHtml = campaign.htmlContent
            .replace(/\{\{firstName\}\}/g, contact.firstName || "")
            .replace(/\{\{lastName\}\}/g, contact.lastName || "")
            .replace(/\{\{email\}\}/g, contact.email)
            .replace(/\{\{subject\}\}/g, campaign.subject)
            .replace(/\{\{organizationName\}\}/g, campaign.organization.name)
            .replace(
              /\{\{unsubscribeUrl\}\}/g,
              `${baseUrl}/unsubscribe?email=${encodeURIComponent(contact.email)}&org=${campaign.organizationId}`
            )

          const { data, error } = await resend.emails.send({
            from: `${campaign.fromName} <${campaign.fromEmail}>`,
            to: [contact.email],
            subject: campaign.subject,
            html: personalizedHtml,
            text: campaign.textContent || undefined,
            replyTo: campaign.replyTo || undefined,
            tags: [
              { name: "campaign_id", value: campaign.id },
              { name: "organization_id", value: campaign.organizationId },
            ],
          })

          if (error) {
            results.push({ email: contact.email, status: "error", error: error.message })
          } else {
            results.push({ email: contact.email, status: "sent", id: data?.id })
          }
        } catch (err) {
          results.push({ email: contact.email, status: "error", error: (err as Error).message })
        }
      }

      // Log delivered events para esta tanda
      const sentInBatch = results.slice(-batch.length).filter((r) => r.status === "sent")
      for (const result of sentInBatch) {
        await prisma.emailEvent.create({
          data: {
            type: "DELIVERED",
            email: result.email,
            timestamp: new Date(),
            campaignId: campaign.id,
          },
        })
      }

      // Actualizar progreso en la campaña (opcional: podríamos guardar progreso)
      const progress = Math.round(((batchIndex + 1) * BATCH_SIZE / totalContacts) * 100)
      console.log(`[campaign ${id}] Progreso: ~${Math.min(progress, 100)}%`)
    }

    // Update campaign status final
    const allFailed = results.every((r) => r.status === "error")
    const anySent = results.some((r) => r.status === "sent")

    await prisma.campaign.update({
      where: { id },
      data: {
        status: anySent ? "SENT" : allFailed ? "FAILED" : "SENT",
        sentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "error").length,
      total: totalContacts,
      batches: batches.length,
      results,
    })
  } catch (error) {
    console.error("Send campaign error:", error)
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 })
  }
}
