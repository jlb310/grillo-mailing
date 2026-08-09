import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLoginThrottled, recordLoginFailure, clearLoginFailures } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.empresaId = user.empresaId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "SUPER_ADMIN" | "ADMIN";
        session.user.empresaId = token.empresaId as string | undefined;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailKey = credentials.email.toString().toLowerCase().trim();
        const { throttled, retryAfterMs } = isLoginThrottled(emailKey);
        if (throttled) {
          console.warn(`[auth] Login attempt for ${emailKey} rejected: throttled${retryAfterMs ? ` (retry in ${Math.ceil(retryAfterMs / 1000)}s)` : ""}`);
          return null;
        }

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          recordLoginFailure(emailKey);
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) {
          recordLoginFailure(emailKey);
          return null;
        }

        clearLoginFailures(emailKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          empresaId: user.empresaId ?? undefined,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
