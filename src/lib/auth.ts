import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          organizationId: user.organizationId,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.organizationId = user.organizationId
      }
      // Permitir al SUPERADMIN cambiar la organización activa desde el cliente
      if (trigger === "update" && session?.activeOrganizationId !== undefined) {
        token.activeOrganizationId = session.activeOrganizationId as string | null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as UserRole
        session.user.organizationId = token.organizationId as string | null
        session.user.activeOrganizationId = token.activeOrganizationId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  }
}

/**
 * Resuelve la organización efectiva para un request.
 * - SUPERADMIN: puede operar en cualquier org pasando ?organizationId=...
 *   o usando la organización activa de la sesión.
 * - ADMIN / USER: solo su propia organización.
 */
export function getEffectiveOrganizationId(
  session: { user: { role: UserRole; organizationId: string | null; activeOrganizationId?: string | null } },
  requestedOrgId?: string | null
): string | null {
  const { role, organizationId, activeOrganizationId } = session.user

  if (role === UserRole.SUPERADMIN) {
    return requestedOrgId ?? activeOrganizationId ?? null
  }

  return organizationId ?? null
}

/**
 * Verifica que el usuario tenga acceso a una organización específica.
 */
export function canAccessOrganization(
  session: { user: { role: UserRole; organizationId: string | null } },
  targetOrgId: string
): boolean {
  const { role, organizationId } = session.user
  if (role === UserRole.SUPERADMIN) return true
  return organizationId === targetOrgId
}
