-- Imagen fija justo antes del footer (debajo de productos/cuerpo), con link
-- opcional. Nullable y data-safe: no requiere backfill.
ALTER TABLE "Campaign" ADD COLUMN "preFooterImageUrl" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "preFooterImageLink" TEXT;
