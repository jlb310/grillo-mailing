import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Resend webhook payload structure
    // https://resend.com/docs/dashboard/webhooks
    const events = Array.isArray(body) ? body : [body]
    
    for (const event of events) {
      const { type, data } = event
      
      if (!data || !data.to) continue

      // Find campaign by tags or email
      const campaign = await prisma.campaign.findFirst({
        where: {
          OR: [
            { resendBatchId: data.batch_id },
            {
              events: {
                some: {
                  email: data.to[0],
                  type: "DELIVERED",
                },
              },
            },
          ],
        },
      })

      // Find contact
      const contact = await prisma.contact.findFirst({
        where: { email: data.to[0] },
      })

      const eventTypeMap: Record<string, string> = {
        "email.sent": "DELIVERED",
        "email.delivered": "DELIVERED",
        "email.opened": "OPENED",
        "email.clicked": "CLICKED",
        "email.bounced": "BOUNCED",
        "email.complained": "COMPLAINED",
        "email.delivery_delayed": "DEFERRED",
        "email.dropped": "DROPPED",
      }

      const mappedType = eventTypeMap[type] || type

      await prisma.emailEvent.create({
        data: {
          type: mappedType as any,
          email: data.to[0],
          timestamp: new Date(data.created_at || Date.now()),
          ip: data.click?.ip || null,
          userAgent: data.click?.userAgent || null,
          link: data.click?.link || null,
          country: data.geo?.country || null,
          city: data.geo?.city || null,
          contactId: contact?.id || null,
          campaignId: campaign?.id || null,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

// Resend may send GET requests for verification
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok" })
}
