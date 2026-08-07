-- Cuenta Resend propia por empresa (opcional). Nullable y data-safe: sin
-- estos campos, el envío sigue usando la cuenta/dominio genéricos de Grillo.
ALTER TABLE "Empresa" ADD COLUMN "resendApiKeyEncrypted" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "resendFromName" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "resendFromEmail" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "resendWebhookSecretEncrypted" TEXT;
