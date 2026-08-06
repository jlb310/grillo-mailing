export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Mail, Users, TrendingUp, MousePointer, Plus, ArrowUpRight, Send } from "lucide-react";
import { scopeWhere } from "@/lib/empresa";

export default async function AdminDashboard() {
  const [campaignCount, contactCount, sendCount, recentCampaigns] =
    await Promise.all([
      prisma.campaign.count({ where: await scopeWhere() }),
      prisma.contact.count({ where: await scopeWhere() }),
      prisma.sendLog.count({
        where: { campaign: { ...(await scopeWhere()) } },
      }),
      prisma.campaign.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        where: await scopeWhere(),
        include: {
          empresa: { select: { name: true } },
          sendLogs: { select: { openedAt: true, clickedAt: true } },
          _count: { select: { sendLogs: true } },
        },
      }),
    ]);

  const opens = recentCampaigns.flatMap((c) => c.sendLogs).filter((l) => l.openedAt).length;
  const clicks = recentCampaigns.flatMap((c) => c.sendLogs).filter((l) => l.clickedAt).length;
  const openRate = sendCount > 0 ? Math.round((opens / sendCount) * 100) : 0;
  const clickRate = sendCount > 0 ? Math.round((clicks / sendCount) * 100) : 0;

  const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
    DRAFT:     { label: "Borrador",   dot: "bg-zinc-300",    text: "text-zinc-500" },
    SCHEDULED: { label: "Programada", dot: "bg-amber-400",   text: "text-amber-600" },
    SENDING:   { label: "Enviando",   dot: "bg-orange-400",  text: "text-orange-600" },
    SENT:      { label: "Enviada",    dot: "bg-emerald-400", text: "text-emerald-600" },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#207029]/50 mb-1">Resumen general</p>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Tus campañas</h1>
        </div>
        <Link
          href="/admin/campanas/nueva"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#207029] text-white text-sm font-semibold hover:bg-[#005f12] transition-colors shadow-sm shadow-[#207029]/20"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Campañas",      value: campaignCount, icon: Mail,          color: "#207029", bg: "#EEF2FF" },
          { label: "Contactos",     value: contactCount,  icon: Users,          color: "#059669", bg: "#ECFDF5" },
          { label: "Emails enviados", value: sendCount,   icon: Send,           color: "#7C3AED", bg: "#F5F3FF" },
          { label: "Tasa de apertura", value: `${openRate}%`, icon: TrendingUp, color: "#D97706", bg: "#FFFBEB" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: bg }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Campañas recientes</h2>
          <Link href="/admin/campanas" className="text-xs text-[#207029] font-medium flex items-center gap-1 hover:underline">
            Ver todas <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-5 h-5 text-[#207029]" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Aún no hay campañas</p>
            <p className="text-xs text-gray-400 mb-4">Creá tu primera campaña para empezar a enviar</p>
            <Link href="/admin/campanas/nueva" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#207029] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Crear campaña
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Campaña</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Empresa</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Enviados</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Aperturas</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentCampaigns.map((c) => {
                const total = c._count.sendLogs;
                const cOpens = c.sendLogs.filter((l) => l.openedAt).length;
                const rate = total > 0 ? Math.round((cOpens / total) * 100) : null;
                const st = statusConfig[c.status] ?? statusConfig.DRAFT;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/admin/campanas/${c.id}`} className="font-medium text-gray-800 hover:text-[#207029] transition-colors line-clamp-1">
                        {c.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs truncate max-w-[140px]">{c.empresa.name}</td>
                    <td className="px-4 py-3.5 text-right text-gray-600 font-medium">{total || "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      {rate !== null ? (
                        <span className="font-semibold text-gray-700">{rate}%</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick stats bar */}
      {sendCount > 0 && (
        <div className="bg-[#207029] rounded-2xl p-5 flex items-center gap-8">
          <div>
            <p className="text-white/50 text-xs font-medium mb-0.5">Total enviados</p>
            <p className="text-white text-xl font-bold">{sendCount.toLocaleString()}</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-white/50 text-xs font-medium mb-0.5">Tasa de apertura</p>
            <p className="text-white text-xl font-bold">{openRate}%</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-white/50 text-xs font-medium mb-0.5">Tasa de clicks</p>
            <p className="text-white text-xl font-bold">{clickRate}%</p>
          </div>
          <div className="ml-auto">
            <MousePointer className="w-5 h-5 text-white/20" />
          </div>
        </div>
      )}
    </div>
  );
}
