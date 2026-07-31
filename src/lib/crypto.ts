import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

/**
 * Cifrado simétrico para los secretos de terceros que guardamos por cliente
 * (hoy: las API keys de Resend).
 *
 * AES-256-GCM: además de cifrar, autentica. Si alguien toca el registro en la
 * base, el descifrado falla en vez de devolver basura silenciosamente.
 *
 * Formato guardado: `v1.<iv>.<tag>.<ciphertext>`, todo en base64url. El prefijo
 * de versión existe para poder rotar de algoritmo sin adivinar qué es cada fila.
 */

const VERSION = "v1"
const IV_BYTES = 12 // el tamaño que recomienda GCM
const KEY_BYTES = 32

export class EncryptionKeyError extends Error {}

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new EncryptionKeyError(
      "Falta ENCRYPTION_KEY. Genérala con: openssl rand -base64 32"
    )
  }

  // Aceptamos base64 o hex para no pelear con el formato que haya a mano.
  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64")

  if (key.length !== KEY_BYTES) {
    throw new EncryptionKeyError(
      `ENCRYPTION_KEY debe tener 32 bytes (llegaron ${key.length}). Genérala con: openssl rand -base64 32`
    )
  }

  return key
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])

  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, ciphertext] = stored.split(".")
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("El secreto guardado no tiene un formato reconocible")
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tag, "base64url"))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

/**
 * Para mostrar en la UI: `re_••••••a1b2`. Nunca devolvemos la key entera al
 * navegador, ni siquiera al admin que la pegó.
 */
export function maskSecret(plaintext: string): string {
  const tail = plaintext.slice(-4)
  const prefix = plaintext.startsWith("re_") ? "re_" : ""
  return `${prefix}••••••${tail}`
}

/** Comparación en tiempo constante, para firmas de webhook. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
