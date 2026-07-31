-- AlterTable
-- Credenciales de la cuenta de Resend propia de cada cliente. Se guardan
-- cifradas con AES-256-GCM (ver src/lib/crypto.ts), nunca en claro.
ALTER TABLE "organizations" ADD COLUMN     "resendApiKey" TEXT,
ADD COLUMN     "resendWebhookSecret" TEXT;
