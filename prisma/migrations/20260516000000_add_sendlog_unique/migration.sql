-- Remove duplicate SendLog rows (keep the one with the latest createdAt)
DELETE FROM "SendLog"
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "campaignId", "contactId" ORDER BY "createdAt" DESC) AS rn
    FROM "SendLog"
  ) sub
  WHERE rn > 1
);

-- Add unique constraint
CREATE UNIQUE INDEX "SendLog_campaignId_contactId_key" ON "SendLog"("campaignId", "contactId");
