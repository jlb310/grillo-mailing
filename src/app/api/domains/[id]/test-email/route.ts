import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncDomainWithResend } from "@/lib/domains"
import { ResendConfigError, getResendClient } from "@/lib/resend"

/**
 * Manda un correo suelto desde el dominio, a una dirección que escribe el admin.
 *
 * Es la única forma de comprobar que un cliente puede enviar de verdad sin
 * armarle una campaña: sale por SU cuenta de Resend y con SU dominio, que es
 * justo lo que puede estar mal (key de otra cuenta, dominio verificado en la
 * cuenta equivocada, DNS a medias).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const domain = await prisma.domain.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  })
  if (!domain) {
    return NextResponse.json({ error: "Dominio no encontrado" }, { status: 404 })
  }

  if (!canAccessOrganization(session, domain.organizationId)) {
    return NextResponse.json({ error: "No tienes acceso a este dominio" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const to = String(body.to ?? "").trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Escribe una dirección de destino válida" }, { status: 400 })
  }

  // El buzón de origen no necesita existir: Resend solo exige que el dominio
  // esté verificado en la cuenta desde la que se envía. Pero la parte local
  // entra a la cabecera From, así que se valida en vez de interpolarse: un
  // salto de línea ahí es inyección de cabeceras.
  const localPart = String(body.from ?? "pruebas").trim() || "pruebas"
  if (!/^[A-Za-z0-9._%+-]{1,64}$/.test(localPart)) {
    return NextResponse.json(
      { error: "El buzón de origen solo admite letras, números y . _ % + -" },
      { status: 400 }
    )
  }

  // El nombre de la organización lo escribe un admin, pero igual va entre
  // comillas y sin caracteres que puedan cerrar el display-name.
  const displayName = domain.organization.name.replace(/[\r\n"<>]/g, " ").trim()
  const from = `"${displayName}" <${localPart}@${domain.name}>`

  try {
    // Sincronizar primero baja el estado real y, si hace falta, adopta el
    // dominio: así el chequeo de abajo no rechaza uno que en Resend ya está
    // verificado y acá seguía en PENDING.
    const synced = await syncDomainWithResend(domain)

    if (!synced.linkedToResend) {
      return NextResponse.json(
        {
          error: `${domain.name} no existe en la cuenta de Resend de ${domain.organization.name}.`,
        },
        { status: 409 }
      )
    }

    if (synced.domain.status !== "VERIFIED") {
      return NextResponse.json(
        {
          error: `${domain.name} todavía no está verificado en Resend, así que el envío sería rechazado. Carga los registros DNS y pulsa «Verificar».`,
        },
        { status: 409 }
      )
    }

    const resend = await getResendClient(domain.organizationId)
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: `Prueba de envío — ${domain.organization.name}`,
      html:
        `<div style="font-family:system-ui,sans-serif;line-height:1.6">` +
        `<h1 style="font-size:20px;margin:0 0 12px">Prueba de envío</h1>` +
        `<p>Este correo salió de la cuenta de Resend de <strong>${domain.organization.name}</strong>, ` +
        `desde el dominio <strong>${domain.name}</strong>.</p>` +
        `<p>Si llegó a la bandeja y no a spam, este cliente ya puede enviar campañas.</p>` +
        `</div>`,
      text:
        `Prueba de envío\n\n` +
        `Este correo salió de la cuenta de Resend de ${domain.organization.name}, ` +
        `desde el dominio ${domain.name}.\n` +
        `Si llegó a la bandeja y no a spam, este cliente ya puede enviar campañas.\n`,
    })

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Resend rechazó el envío" },
        { status: 502 }
      )
    }

    return NextResponse.json({ id: data.id, from, to })
  } catch (error) {
    if (error instanceof ResendConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[domains] prueba de envío fallida", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error enviando la prueba" },
      { status: 502 }
    )
  }
}
