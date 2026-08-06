-- Track opens for certificate emails: store the Resend message id on send so
-- the webhook (/api/webhooks/resend) can match an email.opened event back to
-- the certificate and stamp openedAt.
ALTER TABLE "Certificate" ADD COLUMN "resendId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "openedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Certificate_resendId_idx" ON "Certificate"("resendId");
