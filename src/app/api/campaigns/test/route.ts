import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getResendClient } from "@/lib/resend"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      subject,
      htmlContent,
      textContent,
      fromName,
      fromEmail,
      replyTo,
      domainId,
      organizationId,
      testEmail,
    } = body

    const recipient = typeof testEmail === "string" ? testEmail.trim() : ""
    const senderEmail = typeof fromEmail === "string" ? fromEmail.trim().toLowerCase() : ""

    if (!recipient || !subject || !htmlContent || !senderEmail) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios: email de prueba, asunto, contenido HTML o remitente" },
        { status: 400 }
      )
    }

    // Validar acceso a la organización
    let effectiveOrgId = organizationId || session.user?.organizationId

    // Buscar dominio: por ID o por fromEmail
    let domain = null
    if (domainId) {
      domain = await prisma.domain.findUnique({ where: { id: domainId } })
    } else if (senderEmail) {
      const emailDomain = senderEmail.split("@")[1]
      if (emailDomain) {
        domain = await prisma.domain.findFirst({
          where: { name: emailDomain },
        })
      }
    }

    if (!domain) {
      return NextResponse.json({ error: "Dominio no encontrado" }, { status: 404 })
    }

    if (!effectiveOrgId) {
      effectiveOrgId = domain.organizationId
    }

    if (!effectiveOrgId) {
      return NextResponse.json({ error: "Falta la organización" }, { status: 400 })
    }

    if (domain.organizationId !== effectiveOrgId) {
      return NextResponse.json({ error: "El dominio no pertenece a esta organización" }, { status: 403 })
    }

    if (!canAccessOrganization(session, effectiveOrgId)) {
      return NextResponse.json({ error: "No tienes acceso a esta organización" }, { status: 403 })
    }

    if (domain.status !== "VERIFIED") {
      return NextResponse.json({ error: "El dominio no está verificado" }, { status: 400 })
    }

    // Verificar que fromEmail coincide con el dominio
    if (!senderEmail.endsWith(`@${domain.name.toLowerCase()}`)) {
      return NextResponse.json(
        { error: `El remitente debe usar el dominio @${domain.name}` },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: effectiveOrgId },
    })

    const resend = await getResendClient(effectiveOrgId)

    const personalizedHtml = htmlContent
      .replace(/\{\{firstName\}\}/g, "[Nombre]")
      .replace(/\{\{lastName\}\}/g, "[Apellido]")
      .replace(/\{\{email\}\}/g, recipient)
      .replace(/\{\{subject\}\}/g, subject)
      .replace(/\{\{organizationName\}\}/g, organization?.name || "")
      .replace(
        /\{\{unsubscribeUrl\}\}/g,
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/unsubscribe?email=${encodeURIComponent(recipient)}&org=${effectiveOrgId}`
      )

    const { data, error } = await resend.emails.send({
      from: `${fromName || organization?.name || "Grillo"} <${senderEmail}>`,
      to: [recipient],
      subject: `[PRUEBA] ${subject}`,
      html: personalizedHtml,
      text: textContent || undefined,
      replyTo: replyTo || undefined,
      tags: [
        { name: "type", value: "test" },
        { name: "organization_id", value: effectiveOrgId },
      ],
    })

    if (error) {
      return NextResponse.json(
        { error: `Error de Resend: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data?.id,
      message: `Email de prueba enviado a ${recipient}`,
    })
  } catch (error) {
    console.error("Send test email error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el email de prueba" },
      { status: 500 }
    )
  }
}
