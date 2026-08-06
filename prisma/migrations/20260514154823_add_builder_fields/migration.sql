-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "blocks" JSONB,
ADD COLUMN     "footerText" TEXT,
ADD COLUMN     "headerColor" TEXT,
ADD COLUMN     "logoUrl" TEXT;
