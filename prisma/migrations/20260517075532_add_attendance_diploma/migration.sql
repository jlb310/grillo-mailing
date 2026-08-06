-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "attended" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "firmante" TEXT,
ADD COLUMN     "firmanteTitle" TEXT;
