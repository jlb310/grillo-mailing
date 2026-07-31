import type { Domain } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  DnsRecord,
  checkDmarc,
  getResendClient,
  hasVerifiedRecord,
  mapDomainStatus,
  toDnsRecords,
} from "@/lib/resend"

export interface DomainDetail {
  domain: Domain
  region: string | null
  records: DnsRecord[]
  /** Dominios dados de alta antes de la integración no tienen id en Resend. */
  linkedToResend: boolean
}

/**
 * Trae el estado real desde Resend y lo baja a la base.
 *
 * Los tres flags de la ficha salen de fuentes distintas: SPF y DKIM los reporta
 * Resend por registro, y DMARC lo resolvemos por DNS porque Resend no lo
 * gestiona (antes el badge estaba siempre gris justamente por eso).
 */
export async function syncDomainWithResend(domain: Domain): Promise<DomainDetail> {
  if (!domain.resendDomainId) {
    return { domain, region: null, records: [], linkedToResend: false }
  }

  const resend = await getResendClient(domain.organizationId)
  const { data, error } = await resend.domains.get(domain.resendDomainId)

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
