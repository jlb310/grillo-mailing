export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canAccessEmpresa } from "@/lib/empresa";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Plus, Mail, Building2 } from "lucide-react";
import UploadContactosButton from "./upload-contactos-button";
import GruposPanel from "./grupos-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmpresaDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;
  if (!(await canAccessEmpresa(id))) redirect("/admin");

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      campaigns: { orderBy: { createdAt: "desc" } },
      contactGroups: {
        include: { _count: { select: { contacts: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!empresa) notFound();

  const campaignStatus: Record<string, string> = {
    DRAFT: "Borrador", SENDING: "Enviando", SENT: "Enviada", SCHEDULED: "Programada",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/empresas" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#207029]" />
            <h1 className="text-2xl font-bold text-gray-900">{empresa.name}</h1>
          </div>
        </div>
        <Link href={`/admin/campanas/nueva?empresaId=${empresa.id}`}>
          <Button className="bg-[#207029] hover:bg-[#005f12] text-white">
            <Plus className="w-4 h-4 mr-2" /> Nueva campaña
          </Button>
        </Link>
      </div>

      {empresa.description && (
        <p className="text-sm text-gray-500 -mt-3">{empresa.description}</p>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Campañas */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#207029]" /> Campañas ({empresa.campaigns.length})
            </CardTitle>
            <Link href={`/admin/campanas/nueva?empresaId=${empresa.id}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Nueva
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {empresa.campaigns.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin campañas aún</p>
            ) : (
              <div className="space-y-2">
                {empresa.campaigns.map((c) => (
                  <Link key={c.id} href={`/admin/campanas/${c.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{c.subject}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(c.createdAt).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "SENT" ? "bg-green-100 text-green-700" :
                        c.status === "SENDING" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {campaignStatus[c.status] ?? c.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contactos y Grupos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#207029]" /> Contactos ({empresa.contacts.length})
            </CardTitle>
            <UploadContactosButton empresaId={empresa.id} />
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa.contacts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin contactos. Sube un CSV.</p>
            ) : (
              <div className="divide-y max-h-48 overflow-y-auto">
                {empresa.contacts.map((c) => (
                  <div key={c.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="text-gray-400 text-xs">{c.email}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Grupos de envío</p>
              <GruposPanel
                empresaId={empresa.id}
                groups={empresa.contactGroups}
                totalContacts={empresa.contacts.length}
                ungroupedCount={
                  empresa.contacts.length -
                  empresa.contactGroups.reduce((acc, g) => acc + g._count.contacts, 0)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
