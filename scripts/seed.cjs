// Seed del admin por defecto. Se ejecuta en cada arranque del contenedor
// (ver scripts/entrypoint.sh) y es idempotente: si el admin ya existe, no hace nada.
const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaLibSql } = require('@prisma/adapter-libsql')
const bcrypt = require('bcryptjs')

const ADMIN_EMAIL = 'admin@grillo.click'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

async function seed() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })

  if (existing) {
    console.log('ℹ️  Admin ya existe, no se toca')
    return
  }

  // Sin ADMIN_PASSWORD generamos una clave aleatoria en vez de caer en un
  // default débil. Se imprime una única vez, acá: no queda guardada en ningún lado.
  const generated = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url')

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Administrador Grillo',
      password: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    },
  })

  if (generated) {
    console.log('')
    console.log('⚠️  ADMIN_PASSWORD no estaba definida. Admin creado con clave aleatoria:')
    console.log('')
    console.log(`      ${ADMIN_EMAIL}`)
    console.log(`      ${password}`)
    console.log('')
    console.log('⚠️  Copiala AHORA: no se vuelve a mostrar. Cambiala después del primer login.')
    console.log('')
  } else {
    console.log(`✅ Admin creado con ADMIN_PASSWORD: ${ADMIN_EMAIL}`)
  }
}

seed()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
