import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getResendClient } from "@/lib/resend"

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    
    // Find campaigns that are scheduled and past their scheduled time
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
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

    const results = []

    for (const campaign of scheduledCampaigns) {
      try {
        // Update status to sending
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "SENDING" },
        })

        // Cada campaña sale por la cuenta de Resend de su propio cliente.
        const resend = await getResendClient(campaign.organizationId)

        const contacts = campaign.contactList?.members
          .map((m) => m.contact)
          .filter((c) => !c.unsubscribed) || []

        if (contacts.length === 0) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: "FAILED" },
          })
          results.push({ id: campaign.id, status: "failed", reason: "No valid contacts" })
          continue
        }

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const sentResults = []

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

            const { error } = await resend.emails.send({
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

            if (!error) {
              sentResults.push(contact.email)
            }
          } catch (err) {
            console.error(`Failed to send to ${contact.email}:`, err)
          }
        }

        // Log delivered events
        for (const email of sentResults) {
          await prisma.emailEvent.create({
            data: {
              type: "DELIVERED",
              email,
              timestamp: new Date(),
              campaignId: campaign.id,
            },
          })
        }

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: sentResults.length > 0 ? "SENT" : "FAILED",
            sentAt: new Date(),
          },
        })

        results.push({
          id: campaign.id,
          status: sentResults.length > 0 ? "sent" : "failed",
          sent: sentResults.length,
          total: contacts.length,
        })
      } catch (err) {
        console.error(`Failed to process scheduled campaign ${campaign.id}:`, err)
        results.push({ id: campaign.id, status: "error", error: (err as Error).message })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("Scheduled campaigns error:", error)
    return NextResponse.json({ error: "Failed to process scheduled campaigns" }, { status: 500 })
  }
}
