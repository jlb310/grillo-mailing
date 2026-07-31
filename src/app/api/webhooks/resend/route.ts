import { NextRequest, NextResponse } from "next/server"
import type { EventType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/lib/crypto"
import { readSignatureHeaders, verifySignature } from "@/lib/webhook-signature"

/**
 * Secretos de firma con los que puede venir un evento: el de la cuenta global
 * de la agencia y el de cada cliente que tenga cuenta propia.
 */
async function collectWebhookSecrets(): Promise<string[]> {
  const secrets: string[] = []

  const global = process.env.RESEND_WEBHOOK_SECRET
  if (global) secrets.push(global)

  const orgs = await prisma.organization.findMany({
    where: { resendWebhookSecret: { not: null } },
    select: { resendWebhookSecret: true },
  })

  for (const org of orgs) {
    try {
      secrets.push(decryptSecret(org.resendWebhookSecret!))
    } catch {
      // Secreto ilegible (típicamente por rotación de ENCRYPTION_KEY): se
      // ignora, y los eventos de esa cuenta quedarán rechazados hasta que lo
      // vuelvan a pegar. Preferimos eso a aceptar sin verificar.
    }
  }

  return secrets
}

export async function POST(req: NextRequest) {
  try {
    // Texto crudo: la firma se calcula sobre los bytes exactos que llegaron.
    const raw = await req.text()
    const secrets = await collectWebhookSecrets()

    // Sin secreto no hay contra qué verificar, así que no se procesa nada.
    // Aceptar "mientras tanto" dejaría a cualquiera inventando aperturas y
    // rebotes; preferimos perder eventos —Resend los reintenta— antes que
    // guardar métricas que alguien pudo fabricar.
    if (secrets.length === 0) {
      console.error(
        "[webhooks/resend] evento rechazado: falta RESEND_WEBHOOK_SECRET (o el secreto de la organización)"
      )
      return NextResponse.json({ error: "Webhook sin secreto configurado" }, { status: 503 })
    }

    if (!verifySignature({ headers: readSignatureHeaders(req.headers), body: raw, secrets })) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
    }

    const body = JSON.parse(raw)

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

      const eventTypeMap: Record<string, EventType> = {
        "email.sent": "DELIVERED",
        "email.delivered": "DELIVERED",
        "email.opened": "OPENED",
        "email.clicked": "CLICKED",
        "email.bounced": "BOUNCED",
        "email.complained": "COMPLAINED",
        "email.delivery_delayed": "DEFERRED",
        "email.dropped": "DROPPED",
      }

      const mappedType = eventTypeMap[type]
      // Un tipo que no conocemos no entra a la tabla: la columna es un enum y
      // el insert reventaría igual, solo que con un 500 en vez de un aviso.
      if (!mappedType) {
        console.warn(`[webhooks/resend] tipo de evento no soportado: ${type}`)
        continue
      }

      await prisma.emailEvent.create({
        data: {
          type: mappedType,
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
