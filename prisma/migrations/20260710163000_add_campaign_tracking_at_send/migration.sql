-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "openTrackingAtSend" BOOLEAN,
ADD COLUMN     "clickTrackingAtSend" BOOLEAN;

-- Backfill: every campaign already sent went out before open/click tracking was
-- working, so mark them explicitly as sent-without-tracking. This makes the UI
-- show "Sin seguimiento" (instead of a misleading 0) for all historical sends.
UPDATE "Campaign"
SET "openTrackingAtSend" = false,
    "clickTrackingAtSend" = false
WHERE "status" = 'SENT';
