import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// OJO: no validar DATABASE_URL en el scope del módulo. Next.js importa esta
// ruta durante `next build` (paso "Collecting page data"), donde la variable no
// existe, y cualquier throw acá rompe el build. `pg` no abre la conexión al
// construir el pool, así que la config se resuelve recién en el primer query.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
