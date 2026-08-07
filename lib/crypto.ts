import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM at rest for per-empresa secrets (Resend API key, webhook signing
// secret) that admins paste into the app. ENCRYPTION_KEY must be a base64
// 32-byte key (see docker-compose.yml). Losing/rotating it means every
// encrypted value has to be re-entered — there is no migration path.
const IV_LENGTH = 12; // GCM standard nonce size

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY no está configurada");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY debe ser una clave base64 de 32 bytes");
  return key;
}

// Output format: base64(iv) + "." + base64(authTag) + "." + base64(ciphertext)
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decrypt(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Valor cifrado con formato inválido");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
