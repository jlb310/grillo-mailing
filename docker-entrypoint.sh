#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Applying SendLog unique constraint if missing..."
npx prisma db execute --stdin <<'SQL' || echo "Constraint step warning (non-fatal)"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'SendLog' AND indexname = 'SendLog_campaignId_contactId_key'
  ) THEN
    DELETE FROM "SendLog"
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY "campaignId", "contactId"
          ORDER BY "resendId" DESC NULLS LAST, "createdAt" DESC
        ) AS rn FROM "SendLog"
      ) sub WHERE rn > 1
    );
    CREATE UNIQUE INDEX "SendLog_campaignId_contactId_key" ON "SendLog"("campaignId", "contactId");
    RAISE NOTICE 'SendLog unique index created.';
  ELSE
    RAISE NOTICE 'SendLog unique index already exists, skipping.';
  END IF;
END $$;
SQL

echo "Setting up admin user..."
node /app/prisma/setup.js || echo "Setup warning (non-fatal): admin may already exist or DB not ready"

echo "Resetting stuck SENDING campaigns to DRAFT..."
npx prisma db execute --stdin <<'SQL' || echo "Reset warning (non-fatal)"
UPDATE "Campaign" SET status = 'DRAFT' WHERE status = 'SENDING';
SQL

echo "Backfilling forward-safe CTA button into all pending campaigns (idempotent)..."
npx tsx scripts/fix-button-all-pending.ts || echo "fix-button-all-pending warning (non-fatal)"

echo "Ensuring Resend open/click tracking + diagnosing webhook (idempotent)..."
npx tsx scripts/setup-resend-tracking.ts || echo "setup-resend-tracking warning (non-fatal)"

echo "Starting application..."
exec node server.js
