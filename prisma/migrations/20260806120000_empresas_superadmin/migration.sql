-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");

-- Empresa inicial Lenyes con id determinístico: adopta todos los datos
-- existentes (campañas, contactos, grupos, encuestas) que antes colgaban de Event.
INSERT INTO "Empresa" (id, name, slug, description, "createdAt", "updatedAt")
VALUES ('cm_empresa_lenyes', 'Lenyes', 'lenyes', 'Empresa piloto de Grillo Mailing', NOW(), NOW());

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ContactGroup" DROP CONSTRAINT "ContactGroup_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Survey" DROP CONSTRAINT "Survey_eventId_fkey";

-- DropIndex
DROP INDEX "Contact_eventId_email_key";

-- DropIndex
DROP INDEX "ContactGroup_eventId_name_key";

-- AlterTable (nullable primero para poder backfillear)
ALTER TABLE "AdminUser" ADD COLUMN     "empresaId" TEXT,
ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'ADMIN';

ALTER TABLE "Campaign" ADD COLUMN     "empresaId" TEXT;

ALTER TABLE "Contact" DROP COLUMN "attended",
ADD COLUMN     "empresaId" TEXT;

ALTER TABLE "ContactGroup" ADD COLUMN     "empresaId" TEXT;

ALTER TABLE "Survey" ADD COLUMN     "empresaId" TEXT;

-- Backfill: los datos existentes pasan a Lenyes
UPDATE "Campaign" SET "empresaId" = 'cm_empresa_lenyes' WHERE "empresaId" IS NULL;
UPDATE "Contact" SET "empresaId" = 'cm_empresa_lenyes' WHERE "empresaId" IS NULL;
UPDATE "ContactGroup" SET "empresaId" = 'cm_empresa_lenyes' WHERE "empresaId" IS NULL;
UPDATE "Survey" SET "empresaId" = 'cm_empresa_lenyes' WHERE "empresaId" IS NULL;

-- Set NOT NULL
ALTER TABLE "Campaign" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "ContactGroup" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Survey" ALTER COLUMN "empresaId" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Campaign" DROP COLUMN "eventId";
ALTER TABLE "Contact" DROP COLUMN "eventId";
ALTER TABLE "ContactGroup" DROP COLUMN "eventId";
ALTER TABLE "Survey" DROP COLUMN "eventId";

-- DropTable
DROP TABLE "Event";

-- DropEnum
DROP TYPE "EventStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Contact_empresaId_email_key" ON "Contact"("empresaId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_empresaId_name_key" ON "ContactGroup"("empresaId", "name");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
