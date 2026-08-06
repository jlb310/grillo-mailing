"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import DeleteButton from "@/components/delete-button";

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador", SCHEDULED: "Programada",
  SENDING: "Enviando", SENT: "Enviada",
};
const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-yellow-100 text-yellow-700",
  SENDING: "bg-orange-100 text-orange-700",
  SENT: "bg-purple-100 text-purple-700",
};

interface CampaignRow {
  id: string;
  subject: string;
  status: string;
  scheduledAt: Date | null;
  sentCount: number;
  openRate: number;
  clickRate: number;
}

interface Props {
  empresaName: string;
  campaigns: CampaignRow[];
}

export default function EmpresaGroup({ empresaName, campaigns }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Empresa header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="font-semibold text-gray-800 text-sm">{empresaName}</span>
          <span className="text-xs text-gray-400 font-normal">{campaigns.length} campaña{campaigns.length !== 1 ? "s" : ""}</span>
        </div>
      </button>

      {/* Campaign rows */}
      {open && (
        <div className="divide-y divide-gray-100">
          {campaigns.map((c) => (
            <div key={c.id} className="relative group">
              <Link href={`/admin/campanas/${c.id}`}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Mail className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.subject}</p>
                      {c.scheduledAt && c.status === "SCHEDULED" && (
                        <p className="text-xs text-yellow-600 mt-0.5">
                          {new Date(c.scheduledAt).toLocaleString("es-CL", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.sentCount > 0 && (
                      <div className="text-right text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{c.sentCount.toLocaleString()} envíos</span>
                        </div>
                        <div>{c.openRate}% abiertos · {c.clickRate}% clicks</div>
                      </div>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status]}`}>
                      {statusLabel[c.status]}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <DeleteButton
                  endpoint={`/api/campanas/${c.id}`}
                  confirm={`¿Eliminar la campaña "${c.subject}"? Esta acción no se puede deshacer.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
