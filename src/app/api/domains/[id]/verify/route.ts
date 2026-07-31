import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncDomainWithResend } from "@/lib/domains"
import { ResendConfigError, getResendClient } from "@/lib/resend"

/**
 * Le pide a Resend que revise los registros DNS y baja el resultado.
 *
 * La verificación de Resend es asíncrona: justo después de dispararla los
 * registros pueden seguir en `pending`, así que la ficha se sincroniza igual y
 * el usuario puede volver a pulsar en unos minutos.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const domain = await prisma.domain.findUnique({ where: { id } })
  if (!domain) {
    return NextResponse.json({ error: "Dominio no encontrado" }, { status: 404 })
  }

  if (
    session.user.role !== "ADMIN" &&
    domain.organizationId !== session.user.organizationId
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Sincronizar primero resuelve el id que falta cuando el dominio se dio de
    // alta a mano en Resend o antes de la integración: syncDomainWithResend lo
    // adopta por nombre. Sin eso no habría a qué pedirle la verificación.
    const synced = await syncDomainWithResend(domain)
    if (!synced.linkedToResend) {
      return NextResponse.json(
        {
          error: `${domain.name} no existe en la cuenta de Resend de este cliente. Revisa que la API key sea la de la cuenta donde lo diste de alta.`,
        },
        { status: 409 }
      )
    }

    const resendDomainId = synced.domain.resendDomainId!
    const resend = await getResendClient(domain.organizationId)
    const { error } = await resend.domains.verify(resendDomainId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json(await syncDomainWithResend(synced.domain))
  } catch (error) {
    if (error instanceof ResendConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[domains] verificación fallida", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error verificando en Resend" },
      { status: 502 }
    )
  }
}
