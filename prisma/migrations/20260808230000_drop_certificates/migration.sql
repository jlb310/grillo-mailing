-- Elimina por completo el módulo de Certificados (feature removida de la app).
-- Drop table order: Certificate (FK a CertificateBatch) primero, luego el batch.
DROP TABLE IF EXISTS "Certificate";
DROP TABLE IF EXISTS "CertificateBatch";

-- Los enums ya no son usados por ninguna tabla.
DROP TYPE IF EXISTS "CertificateStatus";
DROP TYPE IF EXISTS "BatchStatus";
