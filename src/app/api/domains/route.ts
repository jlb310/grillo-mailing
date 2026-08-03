import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, getEffectiveOrganizationId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import {
  DEFAULT_DOMAIN_REGION,
  ResendConfigError,
  findResendDomainByName,
  getResendClient,
  isDomainRegion,
  mapDomainStatus,
  normalizeDomainName,
  toDnsRecords,
} from "@/lib/resend"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestedOrgId = searchParams.get("organizationId")
  const effectiveOrgId = getEffectiveOrganizationId(session, requestedOrgId)

  const domains = await prisma.domain.findMany({
    where: effectiveOrgId ? { organizationId: effectiveOrgId } : {},
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(domains)
}

/**
 * Da de alta el dominio en Resend y recién entonces lo guarda acá, para que no
 * queden dominios locales que Resend no conoce (que era justo lo que pasaba
 * antes: el registro nacía PENDING y nadie lo movía nunca). Devuelve los
 * registros DNS que hay que cargar en el panel del cliente.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const effectiveOrgId = getEffectiveOrganizationId(session, body.organizationId)

    const name = normalizeDomainName(String(body.name ?? ""))
    if (!name) {
      return NextResponse.json(
        { error: "El dominio no es válido. Usa el nombre pelado, por ejemplo: ejemplo.com" },
        { status: 400 }
      )
    }

    if (!effectiveOrgId) {
      return NextResponse.json({ error: "Falta la organización" }, { status: 400 })
    }

    const region = isDomainRegion(body.region) ? body.region : DEFAULT_DOMAIN_REGION

    const existing = await prisma.domain.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { error: `El dominio ${name} ya está registrado` },
        { status: 409 }
      )
    }

    // El dominio se da de alta en la cuenta de Resend de ESTE cliente, que es
    // la misma desde la que después saldrán sus campañas.
    const resend = await getResendClient(effectiveOrgId)

    // Si ya está en la cuenta lo adoptamos en vez de crearlo: puede haberse dado
    // de alta a mano en el dashboard, y entonces suele estar hasta verificado.
    // Crear de nuevo falla siempre, y en una cuenta Free el error que devuelve
    // Resend es el del límite del plan, que despista.
    const alreadyThere = await findResendDomainByName(resend, name)
    const adopted = alreadyThere !== null

    const { data, error } = adopted
      ? await resend.domains.get(alreadyThere.id)
      : await resend.domains.create({ name, region })

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Resend rechazó el alta del dominio" },
        { status: 502 }
      )
    }

    try {
      const domain = await prisma.domain.create({
        data: {
          name,
          organizationId: effectiveOrgId,
          resendDomainId: data.id,
          status: mapDomainStatus(data.status),
        },
        include: { organization: { select: { name: true } } },
      })

      return NextResponse.json({
        domain,
        region: data.region,
        records: toDnsRecords(data.records, name),
        adopted,
      })
    } catch (dbError) {
      // El alta en Resend ya ocurrió: la deshacemos para no dejar el dominio
      // colgando en la cuenta sin un registro local que lo represente. Si lo
      // adoptamos no se toca: ya existía antes de que la app apareciera.
      if (!adopted) await resend.domains.remove(data.id).catch(() => {})
      throw dbError
    }
  } catch (error) {
    if (error instanceof ResendConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[domains] alta fallida", error)
    return NextResponse.json({ error: "No se pudo crear el dominio" }, { status: 500 })
  }
}
