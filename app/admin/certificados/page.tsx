export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Plus } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PROCESSING: "Procesando",
  DONE: "Completado",
};
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-amber-100 text-amber-700",
  DONE: "bg-emerald-100 text-emerald-700",
};

export default async function CertificadosPage() {
  const batches = await prisma.certificateBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { certificates: { select: { status: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificados</h1>
          <p className="text-gray-500 mt-1">
            {batches.length} lote{batches.length !== 1 ? "s" : ""} en total
          </p>
        </div>
        <Link href="/admin/certificados/nuevo">
          <Button className="bg-[#207029] hover:bg-[#005f12] text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo lote
          </Button>
        </Link>
      </div>

      {batches.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay lotes de certificados aún</p>
            <Link href="/admin/certificados/nuevo">
              <Button className="mt-4">Subir CSV de certificados</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {batches.map((b) => {
          const total = b.certificates.length;
          const sent = b.certificates.filter((c) => c.status === "SENT").length;
          const failed = b.certificates.filter((c) => c.status === "FAILED").length;
          return (
            <Link key={b.id} href={`/admin/certificados/${b.id}`}>
              <Card className="hover:border-[#207029]/40 transition-colors">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{b.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {total} destinatario{total !== 1 ? "s" : ""} · {sent} enviado{sent !== 1 ? "s" : ""}
                      {failed > 0 && <span className="text-red-600"> · {failed} fallido{failed !== 1 ? "s" : ""}</span>}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_CLASS[b.status] ?? ""}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
