-- Renombrar enum viejo para poder recrearlo con los valores correctos
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Crear nuevo enum con los roles del modelo multi-tenant
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- Migrar datos existentes:
--   ADMIN (owner de la plataforma) -> SUPERADMIN
--   CLIENT (clientes actuales)      -> ADMIN
--   Cualquier otro                  -> USER
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'SUPERADMIN'::"UserRole"
    WHEN 'CLIENT' THEN 'ADMIN'::"UserRole"
    ELSE 'USER'::"UserRole"
  END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';

-- Eliminar enum viejo
DROP TYPE "UserRole_old";
