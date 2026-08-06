import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let empresaName: string | null = null;
  if (session.user.role !== "SUPER_ADMIN" && session.user.empresaId) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { name: true },
    });
    empresaName = empresa?.name ?? null;
  }

  return (
    <AdminShell
      role={session.user.role ?? "ADMIN"}
      empresaName={empresaName}
      userName={session.user.name ?? session.user.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
