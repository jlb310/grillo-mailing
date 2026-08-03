// Seed idempotente del superadmin y la primera organización (Lenyes).
// Se ejecuta en cada arranque del contenedor (ver scripts/entrypoint.sh).
try { require('dotenv').config() } catch {}
const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const ADMIN_EMAIL = 'admin@grillo.click'

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida')
  process.exit(1)
}

const adapter = new PrismaPg(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

async function seed() {
  // 1) Crear la primera organización (Lenyes) si no existe
  const org = await prisma.organization.upsert({
    where: { slug: 'lenyes' },
    update: {},
    create: {
      name: 'Lenyes',
      slug: 'lenyes',
      description: 'Cliente inaugural de Grillo Mailing',
    },
  })
  console.log(`✅ Organización asegurada: ${org.name} (${org.slug})`)

  // 2) Crear el superadmin si no existe
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })

  if (existing) {
    console.log('ℹ️  Superadmin ya existe, no se toca')
    return
  }

  const generated = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url')

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Administrador Grillo',
      password: await bcrypt.hash(password, 10),
      role: 'SUPERADMIN',
      // organizationId = null: el superadmin NO pertenece a ninguna org;
      // opera dentro de cualquiera mediante activeOrganizationId.
    },
  })

  if (generated) {
    console.log('')
    console.log('⚠️  ADMIN_PASSWORD no estaba definida. Superadmin creado con clave aleatoria:')
    console.log('')
    console.log(`      ${ADMIN_EMAIL}`)
    console.log(`      ${password}`)
    console.log('')
    console.log('⚠️  Copiala AHORA: no se vuelve a mostrar. Cambiala después del primer login.')
    console.log('')
  } else {
    console.log(`✅ Superadmin creado con ADMIN_PASSWORD: ${ADMIN_EMAIL}`)
  }
}

seed()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
