// Seed del admin por defecto. Se ejecuta en cada arranque del contenedor
// (ver scripts/entrypoint.sh) y es idempotente: si el admin ya existe, no hace nada.
const { PrismaClient } = require('@prisma/client')
const { PrismaLibSql } = require('@prisma/adapter-libsql')
const bcrypt = require('bcryptjs')

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

async function seed() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@grillo.click' },
  })

  if (existing) {
    console.log('ℹ️  Admin ya existe')
    return
  }

  const password = process.env.ADMIN_PASSWORD || 'admin123'
  await prisma.user.create({
    data: {
      email: 'admin@grillo.click',
      name: 'Administrador Grillo',
      password: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin creado: admin@grillo.click')
}

seed()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
