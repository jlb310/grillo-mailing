import type { Domain } from "@prisma/client"
import type { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import {
  DnsRecord,
  checkDmarc,
  findResendDomainByName,
  getResendClient,
  hasVerifiedRecord,
  mapDomainStatus,
  toDnsRecords,
} from "@/lib/resend"

export interface DomainDetail {
  domain: Domain
  region: string | null
  records: DnsRecord[]
  /** Falso cuando el dominio no existe en la cuenta de Resend de este cliente. */
  linkedToResend: boolean
}

/**
 * Vincula una fila que no tiene id de Resend con el dominio del mismo nombre que
 * ya exista en la cuenta.
 *
 * Hace falta para los dominios que nacieron antes de la integración y para los
 * que se dieron de alta a mano en el dashboard de Resend: crearlos de nuevo no
 * es opción —el nombre ya está tomado, y en una cuenta Free el error que llega
 * es el del límite del plan— y borrar y volver a agregar cambiaría el DKIM,
 * obligando a reeditar la zona de un dominio que ya estaba verificado.
 */
async function adoptResendDomain(domain: Domain, resend: Resend): Promise<string | null> {
  const found = await findResendDomainByName(resend, domain.name)
  if (!found) return null

  // resendDomainId es único: si otra fila ya lo tiene, vincular esta dejaría dos
  // dominios locales apuntando al mismo de Resend. Preferimos no vincular.
  const taken = await prisma.domain.findUnique({
    where: { resendDomainId: found.id },
    select: { id: true },
  })
  if (taken && taken.id !== domain.id) {
    console.warn(`[domains] ${domain.name} ya está vinculado por otra fila (${taken.id})`)
    return null
  }

  await prisma.domain.update({
    where: { id: domain.id },
    data: { resendDomainId: found.id },
  })

  return found.id
}

/**
 * Trae el estado real desde Resend y lo baja a la base.
 *
 * Los tres flags de la ficha salen de fuentes distintas: SPF y DKIM los reporta
 * Resend por registro, y DMARC lo resolvemos por DNS porque Resend no lo
 * gestiona (antes el badge estaba siempre gris justamente por eso).
 */
export async function syncDomainWithResend(domain: Domain): Promise<DomainDetail> {
  const resend = await getResendClient(domain.organizationId)
  const resendDomainId = domain.resendDomainId ?? (await adoptResendDomain(domain, resend))

  if (!resendDomainId) {
    return { domain, region: null, records: [], linkedToResend: false }
  }

  const { data, error } = await resend.domains.get(resendDomainId)

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo consultar el dominio en Resend")
  }

  const dmarcVerified = await checkDmarc(domain.name)

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: {
      status: mapDomainStatus(data.status),
      spfVerified: hasVerifiedRecord(data.records, "SPF"),
      dkimVerified: hasVerifiedRecord(data.records, "DKIM"),
      dmarcVerified,
    },
  })

  return {
    domain: updated,
    region: data.region,
    records: toDnsRecords(data.records, domain.name),
    linkedToResend: true,
  }
}
