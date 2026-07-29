#!/bin/sh
set -e

echo "🏗️  Iniciando Grillo Mailing..."

# Run Prisma migrations (creates DB if it doesn't exist)
echo "📦 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Prisma client is already generated inside the image at build time

# Seed admin user (idempotent). Vive en su propio archivo: inline con `node -e`
# la shell expandía `$disconnect` como variable vacía y rompía el script.
echo "🌱 Verificando seed..."
node /app/scripts/seed.cjs

echo "🚀 Iniciando servidor..."
exec node server.js
