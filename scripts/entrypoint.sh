#!/bin/sh
set -e

echo "🏗️  Iniciando Grillo Mailing..."

# Run Prisma migrations (creates DB if it doesn't exist)
echo "📦 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Prisma client is already generated inside the image at build time

# Seed admin user (only if no users exist)
echo "🌱 Verificando seed..."
node -e "
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function seed() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@grillo.click' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@grillo.click',
        name: 'Administrador Grillo',
        password: hashed,
        role: 'ADMIN',
      }
    });
    console.log('✅ Admin creado: admin@grillo.click / admin123');
  } else {
    console.log('ℹ️ Admin ya existe');
  }
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
"

echo "🚀 Iniciando servidor..."
exec node server.js
