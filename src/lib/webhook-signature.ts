import { createHmac } from "node:crypto"
import { safeEqual } from "@/lib/crypto"

/**
 * Verificación de la firma de los webhooks de Resend, que por debajo usa Svix.
 *
 * Se implementa a mano en vez de sumar la librería `svix` porque el algoritmo
 * son diez líneas y así no entra otra dependencia solo para esto:
 *
 *   firma = base64(HMAC_SHA256(secreto, "<id>.<timestamp>.<body crudo>"))
 *
 * El cuerpo tiene que ser el texto EXACTO que llegó: si se pasa por JSON.parse
 * y se vuelve a serializar, la firma ya no cuadra.
 */

/** Ventana de tolerancia del timestamp: descarta reenvíos viejos. */
const TOLERANCE_SECONDS = 5 * 60

export interface SignatureHeaders {
  id: string | null
  timestamp: string | null
  signature: string | null
}

/** Svix manda `svix-*`, y en algunos planes `webhook-*`. */
export function readSignatureHeaders(headers: Headers): SignatureHeaders {
  return {
    id: headers.get("svix-id") ?? headers.get("webhook-id"),
    timestamp: headers.get("svix-timestamp") ?? headers.get("webhook-timestamp"),
    signature: headers.get("svix-signature") ?? headers.get("webhook-signature"),
  }
}

export function isTimestampFresh(timestamp: string, now = Date.now()): boolean {
  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return false
  return Math.abs(now / 1000 - sent) <= TOLERANCE_SECONDS
}

/**
 * ¿La firma cuadra con alguno de los secretos que conocemos?
 *
 * Recibe varios porque cada cliente con cuenta propia de Resend tiene su
 * propio secreto, y el evento no dice de qué cuenta viene hasta que se parsea
 * el cuerpo, que es justamente lo que todavía no podemos creerle.
 */
export function verifySignature({
  headers,
  body,
  secrets,
}: {
  headers: SignatureHeaders
  body: string
  secrets: string[]
}): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  if (!isTimestampFresh(timestamp)) return false

  const signedContent = `${id}.${timestamp}.${body}`

  // El header trae una o varias firmas separadas por espacio, cada una
  // como "v1,<base64>". Puede haber más de una durante una rotación de secreto.
  const received = signature
    .split(" ")
    .map((part) => part.split(",", 2))
    .filter(([version]) => version === "v1")
    .map(([, value]) => value)
    .filter(Boolean)

  if (received.length === 0) return false

  return secrets.some((secret) => {
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
    if (key.length === 0) return false

    const expected = createHmac("sha256", key).update(signedContent).digest("base64")
    return received.some((candidate) => safeEqual(candidate, expected))
  })
}
