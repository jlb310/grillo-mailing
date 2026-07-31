/**
 * Regiones de envío de Resend.
 *
 * Vive aparte de lib/resend para que lo pueda importar un componente de
 * cliente: aquel módulo arrastra `node:dns` y el SDK, que no van al navegador.
 * Si Resend agrega o renombra una región, el error salta en el `create()` de
 * la API route, donde este tipo se pasa al SDK.
 */
export type DomainRegion = "us-east-1" | "eu-west-1" | "sa-east-1" | "ap-northeast-1"

export const DOMAIN_REGIONS: { value: DomainRegion; label: string }[] = [
  { value: "sa-east-1", label: "Sudamérica (São Paulo)" },
  { value: "us-east-1", label: "EE.UU. Este (Virginia)" },
  { value: "eu-west-1", label: "Europa (Irlanda)" },
  { value: "ap-northeast-1", label: "Asia Pacífico (Tokio)" },
]

/** Por defecto la más cercana a los clientes: menos latencia de entrega. */
export const DEFAULT_DOMAIN_REGION: DomainRegion = "sa-east-1"

export function isDomainRegion(value: unknown): value is DomainRegion {
  return DOMAIN_REGIONS.some((r) => r.value === value)
}
