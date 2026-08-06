export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmpresaGroup from "./empresa-group";
import { scopeWhere } from "@/lib/empresa";

export default async function CampanasPage() {
  const campaigns = await prisma.campaign.findMany({
    where: await scopeWhere(),
    orderBy: { createdAt: "desc" },
    include: {
      empresa: { select: { id: true, name: true } },
      sendLogs: { select: { resendId: true, openedAt: true, clickedAt: true } },
    },
  });

  // Group by empresa, preserving empresa order of first appearance
  const empresaMap = new Map<string, { name: string; campaigns: typeof campaigns }>();
  for (const c of campaigns) {
    const key = c.empresa.id;
    if (!empresaMap.has(key)) empresaMap.set(key, { name: c.empresa.name, campaigns: [] });
    empresaMap.get(key)!.campaigns.push(c);
  }

  const groups = Array.from(empresaMap.values());
  const totalCampaigns = campaigns.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-gray-500 mt-1">{totalCampaigns} campaña{totalCampaigns !== 1 ? "s" : ""} en total</p>
        </div>
        <Link href="/admin/campanas/nueva">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nueva campaña
          </Button>
        </Link>
      </div>

      {totalCampaigns === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay campañas aún</p>
            <Link href="/admin/campanas/nueva">
              <Button className="mt-4">Crear primera campaña</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {groups.map(({ name, campaigns: group }) => (
          <EmpresaGroup
            key={name}
            empresaName={name}
            campaigns={group.map((c) => {
              const sent = c.sendLogs.filter((l) => l.resendId).length;
              const opens = c.sendLogs.filter((l) => l.openedAt).length;
              const clicks = c.sendLogs.filter((l) => l.clickedAt).length;
              return {
                id: c.id,
                subject: c.subject,
                status: c.status,
                scheduledAt: c.scheduledAt,
                sentCount: sent,
                openRate: sent > 0 ? Math.round((opens / sent) * 100) : 0,
                clickRate: sent > 0 ? Math.round((clicks / sent) * 100) : 0,
              };
            })}
          />
        ))}
      </div>
    </div>
  );
}
