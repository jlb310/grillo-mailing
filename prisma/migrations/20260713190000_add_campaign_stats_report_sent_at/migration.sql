-- Adds the timestamp for the 24h post-send stats report emailed to notifyEmails.
ALTER TABLE "Campaign" ADD COLUMN "statsReportSentAt" TIMESTAMP(3);

-- Backfill: campaigns already sent predate this feature; mark them as reported
-- so the scheduler doesn't blast historical stats reports on first deploy.
UPDATE "Campaign"
SET "statsReportSentAt" = COALESCE("sentAt", NOW())
WHERE "status" = 'SENT';
