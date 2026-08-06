-- Redesign the unused certificate scaffolding into a CSV-driven, batch model.
-- The old "Certificate" / "CertificateTemplate" tables are empty and unused, so
-- they are dropped and recreated rather than altered. The "CertificateStatus"
-- enum is reused.

-- DropTable (drops the FKs Certificate held to Event / SurveyToken / CertificateTemplate)
DROP TABLE IF EXISTS "Certificate";
DROP TABLE IF EXISTS "CertificateTemplate";

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'PROCESSING', 'DONE');

-- CreateTable
CREATE TABLE "CertificateBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "horas" INTEGER NOT NULL,
    "activityTitle" TEXT NOT NULL,
    "activityDate" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Certificate_batchId_idx" ON "Certificate"("batchId");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CertificateBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
