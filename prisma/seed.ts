import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

const client = createClient({ url: 'file:./prisma/dev.db' })
const adapter = new PrismaLibSql({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@grillo.click' }
  })

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    await prisma.user.create({
      data: {
        email: 'admin@grillo.click',
        name: 'Administrador Grillo',
        password: hashedPassword,
        role: UserRole.ADMIN,
      }
    })
    
    console.log('Admin user created: admin@grillo.click / admin123')
  } else {
    console.log('Admin user already exists')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
