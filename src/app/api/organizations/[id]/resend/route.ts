import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Resend } from "resend"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EncryptionKeyError, encryptSecret, maskSecret } from "@/lib/crypto"

/**
 * Credenciales de la cuenta de Resend de un cliente.
 *
 * La API key nunca vuelve al navegador: solo su máscara. Y antes de guardarla
 * la probamos contra Resend, porque una key de solo envío no sirve para dar de
 * alta dominios y el error saldría recién semanas después, al agregar uno.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const organization = await prisma.organization.findUnique({ where: { id } })
  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
    const webhookSecret =
      typeof body.webhookSecret === "string" ? body.webhookSecret.trim() : ""

    if (!apiKey) {
      return NextResponse.json({ error: "Pega la API key de Resend" }, { status: 400 })
    }

    if (!apiKey.startsWith("re_")) {
      return NextResponse.json(
        { error: "Las API keys de Resend empiezan con «re_»" },
        { status: 400 }
      )
    }

    if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
      return NextResponse.json(
        { error: "El secreto del webhook empieza con «whsec_»" },
        { status: 400 }
      )
    }

    // `domains.list` es la prueba barata de que la key existe y tiene permiso
    // completo: con una de solo envío, Resend responde con error.
    const { error } = await new Resend(apiKey).domains.list()
    if (error) {
      return NextResponse.json(
        {
          error: `Resend rechazó la key: ${error.message}. Revisa que sea de tipo «Full access».`,
        },
        { status: 400 }
      )
    }

    await prisma.organization.update({
      where: { id },
      data: {
        resendApiKey: encryptSecret(apiKey),
        resendWebhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      },
    })

    return NextResponse.json({
      hasResendApiKey: true,
      resendApiKeyMask: maskSecret(apiKey),
      hasResendWebhookSecret: Boolean(webhookSecret),
    })
  } catch (error) {
    if (error instanceof EncryptionKeyError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[organizations] guardado de credenciales fallido", error)
    return NextResponse.json({ error: "No se pudieron guardar las credenciales" }, { status: 500 })
  }
}

/** Vuelve a la cuenta global de la agencia. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.organization.update({
    where: { id },
    data: { resendApiKey: null, resendWebhookSecret: null },
  })

  return NextResponse.json({
    hasResendApiKey: false,
    resendApiKeyMask: null,
    hasResendWebhookSecret: false,
  })
}
