export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteButton from "@/components/delete-button";

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  COMPLETED: "Completado",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default async function EventosPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { contacts: true, campaigns: true } } },
  });

  const byStatus = {
    ACTIVE: events.filter((e) => e.status === "ACTIVE"),
    DRAFT: events.filter((e) => e.status === "DRAFT"),
    COMPLETED: events.filter((e) => e.status === "COMPLETED"),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-500 mt-1">{events.length} eventos en total</p>
        </div>
        <Link href="/admin/eventos/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nuevo evento
          </Button>
        </Link>
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay eventos aún</p>
            <Link href="/admin/eventos/nuevo">
              <Button className="mt-4">Crear primer evento</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {Object.entries(byStatus).map(([status, items]) =>
        items.length === 0 ? null : (
          <div key={status}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {statusLabel[status]} ({items.length})
            </h2>
            <div className="grid gap-4">
              {items.map((event) => (
                <div key={event.id} className="relative group">
                  <Link href={`/admin/eventos/${event.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{event.title}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(event.date).toLocaleDateString("es-CL", {
                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                              })}
                              {event.location && ` · ${event.location}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {event._count.contacts} contactos
                            </div>
                            <div>{event._count.campaigns} campañas</div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[event.status]}`}>
                            {statusLabel[event.status]}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton
                      endpoint={`/api/eventos/${event.id}`}
                      confirm={`¿Eliminar el evento "${event.title}" y todos sus contactos y campañas? Esta acción no se puede deshacer.`}
                      redirectTo="/admin/eventos"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
