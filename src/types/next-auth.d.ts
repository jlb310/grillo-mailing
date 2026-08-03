import { DefaultSession } from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
    organizationId: string | null
    activeOrganizationId?: string | null
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      organizationId: string | null
      activeOrganizationId?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    organizationId: string | null
    activeOrganizationId?: string | null
  }
}
