#!/bin/sh
set -e

echo "🏗️  Iniciando Grillo Mailing..."

# Postgres vive en otro contenedor (servicio grillo-mailing-db de Dokploy). Si la
# app arranca antes de que acepte conexiones, `migrate deploy` falla y el
# contenedor entra en reinicio. Esperamos con un backoff acotado.
echo "⏳ Esperando a Postgres..."
i=1
until node -e 'const{Client}=require("pg");const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.end()).catch(()=>process.exit(1))' 2>/dev/null; do
  if [ "$i" -ge 30 ]; then
    echo "❌ Postgres no respondió tras 30 intentos. Revisá DATABASE_URL y que el servicio esté arriba."
    exit 1
  fi
  i=$((i + 1))
  sleep 2
done
echo "✅ Postgres responde"

# Run Prisma migrations
echo "📦 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Prisma client is already generated inside the image at build time

# Seed admin user (idempotent). Vive en su propio archivo: inline con `node -e`
# la shell expandía `$disconnect` como variable vacía y rompía el script.
echo "🌱 Verificando seed..."
node /app/scripts/seed.cjs

# TEMP: crear usuario de prueba para Lenyes (idempotente)
echo "🧪 Verificando usuario de prueba..."
node /app/scripts/create-test-user.cjs

echo "🚀 Iniciando servidor..."
exec node server.js
