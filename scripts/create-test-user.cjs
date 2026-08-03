// Script temporal de prueba: crea un usuario ADMIN para Lenyes con clave conocida.
// Es idempotente: si el usuario ya existe, no hace nada.
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida')
  process.exit(1)
}

const adapter = new PrismaPg(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

const TEST_EMAIL = 'test@lenyes.cl'
const TEST_PASSWORD = 'test123'

async function seed() {
  const org = await prisma.organization.findUnique({ where: { slug: 'lenyes' } })
  if (!org) {
    console.log('❌ Org Lenyes no encontrada')
    return
  }

  const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  if (existing) {
    console.log('ℹ️  Usuario de prueba ya existe:', TEST_EMAIL)
    return
  }

  await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: 'Usuario Prueba Lenyes',
      password: await bcrypt.hash(TEST_PASSWORD, 10),
      role: 'ADMIN',
      organizationId: org.id,
    },
  })

  console.log('')
  console.log('✅ Usuario de prueba creado:')
  console.log(`   ${TEST_EMAIL}`)
  console.log(`   ${TEST_PASSWORD}`)
  console.log('')
}

seed()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
