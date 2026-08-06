#!/bin/sh
set -e

echo "🏗️  Iniciando Grillo Mailing..."

# Postgres vive en otro contenedor. Si la app arranca antes de que acepte
# conexiones, `migrate deploy` falla. Esperamos con retry rápido (max ~15s).
echo "⏳ Esperando a Postgres..."
i=1
until node -e 'const{Client}=require("pg");const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.end()).catch(()=>process.exit(1))' 2>/dev/null; do
  if [ "$i" -ge 15 ]; then
    echo "❌ Postgres no respondió tras 15 intentos. Revisá DATABASE_URL."
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done
echo "✅ Postgres responde"

# Run Prisma migrations
echo "📦 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Seed admin user (idempotent — skipped if admin already exists)
echo "🌱 Verificando seed..."
node /app/scripts/seed.cjs

echo "🚀 Iniciando servidor..."
exec node server.js
