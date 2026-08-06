export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventGroup from "./event-group";

export default async function CampanasPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { id: true, title: true } },
      sendLogs: { select: { resendId: true, openedAt: true, clickedAt: true } },
    },
  });

  // Group by event, preserving event order of first appearance
  const eventMap = new Map<string, { title: string; campaigns: typeof campaigns }>();
  for (const c of campaigns) {
    const key = c.event.id;
    if (!eventMap.has(key)) eventMap.set(key, { title: c.event.title, campaigns: [] });
    eventMap.get(key)!.campaigns.push(c);
  }

  const groups = Array.from(eventMap.values());
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
        {groups.map(({ title, campaigns: group }) => (
          <EventGroup
            key={title}
            eventTitle={title}
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
