export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/empresa";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteButton from "@/components/delete-button";

export default async function EmpresasPage() {
  const session = await auth();
  if (!session || !isSuperAdmin(session)) redirect("/admin");

  const empresas = await prisma.empresa.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true, campaigns: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 mt-1">{empresas.length} empresas en total</p>
        </div>
        <Link href="/admin/empresas/nuevo">
          <Button className="bg-[#207029] hover:bg-[#005f12] text-white">
            <Plus className="w-4 h-4 mr-2" /> Nueva empresa
          </Button>
        </Link>
      </div>

      {empresas.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay empresas aún</p>
            <Link href="/admin/empresas/nuevo">
              <Button className="mt-4 bg-[#207029] hover:bg-[#005f12] text-white">Crear primera empresa</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {empresas.map((empresa) => (
          <div key={empresa.id} className="relative group">
            <Link href={`/admin/empresas/${empresa.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-[#207029]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{empresa.name}</p>
                      <p className="text-sm text-gray-500">
                        {empresa.description || "Sin descripción"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {empresa._count.contacts} contactos
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {empresa._count.campaigns} campañas
                    </div>
                    <Badge className="bg-gray-100 text-gray-600 font-normal">{empresa.slug}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <DeleteButton
                endpoint={`/api/empresas/${empresa.id}`}
                confirm={`¿Eliminar la empresa "${empresa.name}" y todos sus contactos, grupos y campañas? Esta acción no se puede deshacer.`}
                redirectTo="/admin/empresas"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
