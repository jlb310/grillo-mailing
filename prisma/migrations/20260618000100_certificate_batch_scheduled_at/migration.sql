-- Target send time for a scheduled certificate batch. The scheduler releases
-- the batch (status -> PROCESSING, then processBatch) once this is due.
ALTER TABLE "CertificateBatch" ADD COLUMN "scheduledAt" TIMESTAMP(3);
