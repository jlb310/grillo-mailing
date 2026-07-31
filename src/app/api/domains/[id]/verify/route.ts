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

  if (!domain.resendDomainId) {
    return NextResponse.json(
      {
        error:
          "Este dominio se creó antes de la integración y no existe en Resend. Bórralo y vuelve a agregarlo.",
      },
      { status: 409 }
    )
  }

  try {
    const resend = await getResendClient(domain.organizationId)
    const { error } = await resend.domains.verify(domain.resendDomainId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json(await syncDomainWithResend(domain))
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
