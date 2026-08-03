import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canAccessOrganization } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { syncDomainWithResend } from "@/lib/domains"
import { ResendConfigError, getResendClient } from "@/lib/resend"

/** Ficha del dominio con sus registros DNS al día, tal como los ve Resend. */
export async function GET(
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

  if (!canAccessOrganization(session, domain.organizationId)) {
    return NextResponse.json({ error: "No tienes acceso a este dominio" }, { status: 403 })
  }

  try {
    return NextResponse.json(await syncDomainWithResend(domain))
  } catch (error) {
    if (error instanceof ResendConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[domains] consulta fallida", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error consultando Resend" },
      { status: 502 }
    )
  }
}

/**
 * Da de baja el dominio: primero en Resend y después acá.
 *
 * Ese orden es el inverso del alta y es a propósito: si borrásemos la fila
 * local primero y Resend fallara, el dominio quedaría en la cuenta sin nada
 * que lo represente en la app, o sea invisible.
 *
 * Borrar en Resend invalida los registros DNS: al volver a dar de alta el mismo
 * dominio, el DKIM que genera es OTRO y hay que reeditar la zona. Por eso el
 * diálogo de la UI lo avisa antes de confirmar.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const domain = await prisma.domain.findUnique({
    where: { id },
    include: { _count: { select: { campaigns: true } } },
  })
  if (!domain) {
    return NextResponse.json({ error: "Dominio no encontrado" }, { status: 404 })
  }

  // Campaign.domainId es obligatorio, así que la FK impediría el borrado igual:
  // mejor explicarlo que devolver un error de Prisma.
  if (domain._count.campaigns > 0) {
    return NextResponse.json(
      {
        error: `No se puede borrar: ${domain.name} tiene ${domain._count.campaigns} campaña(s) asociada(s). Bórralas primero.`,
      },
      { status: 409 }
    )
  }

  // Si el dominio nació antes de la integración no existe en Resend, así que no
  // hay nada que dar de baja allá.
  let removedFromResend = false
  if (domain.resendDomainId) {
    try {
      const resend = await getResendClient(domain.organizationId)
      const { error } = await resend.domains.remove(domain.resendDomainId)

      if (error) {
        // Que Resend no lo encuentre no es un problema: puede haberse borrado a
        // mano en su dashboard, o vivir en otra cuenta si cambiaron la API key
        // del cliente después de darlo de alta. En ese caso seguimos, porque lo
        // que el usuario pidió es sacarlo de acá.
        const notFound = /not found|no existe/i.test(error.message)
        if (!notFound) {
          return NextResponse.json({ error: error.message }, { status: 502 })
        }
        console.warn(`[domains] ${domain.name} no estaba en la cuenta de Resend consultada`)
      } else {
        removedFromResend = true
      }
    } catch (error) {
      if (error instanceof ResendConfigError) {
        return NextResponse.json({ error: error.message }, { status: 503 })
      }
      console.error("[domains] baja fallida", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Error borrando en Resend" },
        { status: 502 }
      )
    }
  }

  await prisma.domain.delete({ where: { id } })

  return NextResponse.json({ name: domain.name, removedFromResend })
}
