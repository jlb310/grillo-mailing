import { Resend } from "resend"
import type { DomainRecords, DomainStatus as ResendDomainStatus } from "resend"
import type { DomainStatus } from "@prisma/client"
import { resolveTxt } from "node:dns/promises"
import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/lib/crypto"

export {
  DEFAULT_DOMAIN_REGION,
  DOMAIN_REGIONS,
  isDomainRegion,
  type DomainRegion,
} from "@/lib/domain-regions"

export class ResendConfigError extends Error {}

/**
 * Cliente de Resend para una organización.
 *
 * Cada cliente puede tener su propia cuenta de Resend: así su cuota, su
 * facturación y —sobre todo— su reputación de envío no se mezclan con las del
 * resto. Si no configuró ninguna, cae a la cuenta global de la agencia.
 *
 * La key se resuelve en cada llamada, no al importar el módulo, para que una
 * env ausente rompa solo la request que de verdad la necesita y no el arranque
 * de la app (mismo criterio que lib/prisma con DATABASE_URL).
 */
export async function getResendClient(organizationId?: string): Promise<Resend> {
  return new Resend(await resolveResendApiKey(organizationId))
}

export async function resolveResendApiKey(organizationId?: string): Promise<string> {
  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { resendApiKey: true },
    })

    if (org?.resendApiKey) {
      try {
        return decryptSecret(org.resendApiKey)
      } catch {
        // Pasa si rotaron ENCRYPTION_KEY sin volver a pegar las keys. Caer a la
        // cuenta global acá sería peor que fallar: el envío saldría desde la
        // cuenta equivocada, con un dominio que esa cuenta no tiene verificado.
        throw new ResendConfigError(
          "No se pudo descifrar la API key de Resend de este cliente. Vuelve a pegarla en la ficha de la organización."
        )
      }
    }
  }

  const fallback = process.env.RESEND_API_KEY
  if (!fallback) {
    throw new ResendConfigError(
      "Este cliente no tiene API key de Resend y tampoco hay una global (RESEND_API_KEY)."
    )
  }

  return fallback
}

/**
 * Normaliza lo que escribe el usuario: Resend espera el dominio pelado.
 * Devuelve null si no parece un dominio.
 */
export function normalizeDomainName(raw: string): string | null {
  const name = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^[^@]*@/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")

  // Al menos dos etiquetas, sin guiones al borde de cada una.
  const valid = /^(?!-)[a-z0-9-]+(?<!-)(\.(?!-)[a-z0-9-]+(?<!-))+$/.test(name)
  return valid ? name : null
}

/** El estado de Resend es más fino que nuestro enum de tres valores. */
export function mapDomainStatus(status: ResendDomainStatus): DomainStatus {
  switch (status) {
    case "verified":
      return "VERIFIED"
    case "failed":
    case "partially_failed":
      return "FAILED"
    default:
      // pending, not_started, partially_verified: todavía en camino.
      return "PENDING"
  }
}

/** Registro DNS listo para mostrarse en la UI. */
export interface DnsRecord {
  record: string
  type: string
  /** Nombre completo, como lo devuelve Resend. */
  name: string
  /**
   * Lo que hay que escribir en el campo "Name" de un panel tipo cPanel, que
   * añade el dominio solo. Pegar el nombre completo es el error más común.
   */
  host: string
  value: string
  ttl: string
  priority?: number
  status: string
}

/**
 * Resend entrega el nombre completo (`send.ejemplo.com`). Los editores de zona
 * de cPanel, Plesk y cía. concatenan el dominio, así que también calculamos la
 * parte relativa para que el usuario no termine con `send.ejemplo.com.ejemplo.com`.
 */
export function toDnsRecords(records: DomainRecords[], domainName: string): DnsRecord[] {
  const suffix = `.${domainName}`
  return records.map((record) => {
    const host =
      record.name === domainName
        ? "@"
        : record.name.endsWith(suffix)
          ? record.name.slice(0, -suffix.length)
          : record.name

    return {
      record: record.record,
      type: record.type,
      name: record.name,
      host,
      value: record.value,
      ttl: record.ttl,
      priority: "priority" in record ? record.priority : undefined,
      status: record.status,
    }
  })
}

/** ¿Resend ya validó el registro de este tipo? */
export function hasVerifiedRecord(records: DomainRecords[], kind: "SPF" | "DKIM"): boolean {
  const matching = records.filter((r) => r.record === kind)
  return matching.length > 0 && matching.every((r) => r.status === "verified")
}

/**
 * Resend no gestiona DMARC, así que lo consultamos por DNS.
 *
 * Si el dominio es un subdominio sin `_dmarc` propio hereda la política del
 * dominio organizacional, por eso subimos etiquetas hasta que queden dos. Es
 * una aproximación: no consultamos la Public Suffix List, así que un dominio
 * bajo un sufijo de tres etiquetas (`algo.co.uk`) podría dar un falso negativo.
 */
export async function checkDmarc(domainName: string): Promise<boolean> {
  const labels = domainName.split(".")

  for (let i = 0; labels.length - i >= 2; i++) {
    const candidate = labels.slice(i).join(".")
    try {
      const answers = await resolveTxt(`_dmarc.${candidate}`)
      const found = answers.some((chunks) =>
        chunks.join("").trim().toLowerCase().startsWith("v=dmarc1")
      )
      if (found) return true
    } catch {
      // NXDOMAIN o timeout: seguimos subiendo por el árbol.
    }
  }

  return false
}
