-- Add products grid (photo, title, price, button) rendered as 2-column cards
-- in the campaign email body. Nullable and data-safe: no backfill needed.
ALTER TABLE "Campaign" ADD COLUMN "products" JSONB;

-- Social links for the footer (round icons), up to 4: [{ id, network, url }]
ALTER TABLE "Campaign" ADD COLUMN "socials" JSONB;
