-- Guarda los bloques del Email Builder para poder reabrir el editor visual
ALTER TABLE "campaigns" ADD COLUMN "blocks" JSONB;
