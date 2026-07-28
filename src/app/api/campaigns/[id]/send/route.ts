import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

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

    // Verify ownership
    if (session.user.role !== "ADMIN" && campaign.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Send emails via Resend
    // Note: Resend free tier allows up to 100 emails/day. For larger lists, use batch API or queue.
    const results = []
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resend = new Resend(process.env.RESEND_API_KEY || "")

    for (const contact of contacts) {
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

    // Update campaign status
    const allFailed = results.every((r) => r.status === "error")
    const allSent = results.every((r) => r.status === "sent")

    await prisma.campaign.update({
      where: { id },
      data: {
        status: allSent ? "SENT" : allFailed ? "FAILED" : "SENT",
        sentAt: new Date(),
      },
    })

    // Log delivered events for successful sends
    for (const result of results.filter((r) => r.status === "sent")) {
      await prisma.emailEvent.create({
        data: {
          type: "DELIVERED",
          email: result.email,
          timestamp: new Date(),
          campaignId: campaign.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    })
  } catch (error) {
    console.error("Send campaign error:", error)
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 })
  }
}
