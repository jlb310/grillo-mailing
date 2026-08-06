import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin-nav";

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
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav
        role={session.user.role ?? "ADMIN"}
        empresaName={empresaName}
        userName={session.user.name ?? session.user.email ?? ""}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
