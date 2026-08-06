import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export const EMPRESA_COOKIE = "grillo_empresa_id";

export function isSuperAdmin(session: Session | null): boolean {
  return session?.user?.role === "SUPER_ADMIN";
}

// Active empresa for the current request:
// - ADMIN: always their own empresaId (scoped, they have no choice).
// - SUPER_ADMIN: from cookie; null when no empresa selected (sees all).
export async function getActiveEmpresaId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role === "SUPER_ADMIN") {
    const store = await cookies();
    return store.get(EMPRESA_COOKIE)?.value || null;
  }
  return session.user.empresaId ?? null;
}

// Prisma where-clause that scopes queries to the current user's empresa.
// SUPER_ADMIN without cookie returns {} (all empresas); others return { empresaId }.
export async function scopeWhere(): Promise<{ empresaId?: string } | Record<string, never>> {
  const session = await auth();
  if (!session?.user) return { empresaId: "__none__" };
  if (session.user.role === "SUPER_ADMIN") {
    const store = await cookies();
    const id = store.get(EMPRESA_COOKIE)?.value;
    return id ? { empresaId: id } : {};
  }
  return { empresaId: session.user.empresaId ?? "__none__" };
}

// Whether the current user may operate on a given empresa.
export async function canAccessEmpresa(empresaId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === "SUPER_ADMIN") return true;
  return session.user.empresaId === empresaId;
}

// Resolve and validate the empresaId a campaign/contact belongs to against the
// current user's scope. Returns null when not authorized.
export async function resolveEmpresaScope(empresaId: string | undefined | null): Promise<string | null> {
  if (!empresaId) return null;
  const ok = await canAccessEmpresa(empresaId);
  return ok ? empresaId : null;
}
