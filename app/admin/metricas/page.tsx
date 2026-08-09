export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getTrackingStatus } from "@/lib/resend-status";
import { decrypt } from "@/lib/crypto";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { scopeWhere } from "@/lib/empresa";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-9 text-right">{pct}%</span>
    </div>
  );
}

// Small "not measured" marker, reused wherever a tracked-only metric can't be trusted.
function NoTracking() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 italic">
      <HelpCircle className="w-3.5 h-3.5" />
      Sin seguimiento
    </div>
  );
}

export default async function MetricasPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "SENT", ...(await scopeWhere()) },
    orderBy: { sentAt: "desc" },
    include: {
      empresa: { select: { id: true, name: true, resendApiKeyEncrypted: true, resendFromEmail: true, resendWebhookSecretEncrypted: true } },
      sendLogs: {
        select: { openedAt: true, clickedAt: true, bouncedAt: true, contact: { select: { unsubscribed: true } } },
      },
    },
  });

  // Diagnose the tracking of the account/domain each empresa ACTUALLY sends
  // with (own Resend account first, shared Grillo fallback), mirroring the
  // sender resolution in lib/send-campaign.ts — never a single global check,
  // which would blame every empresa for the shared account's state.
  const statuses = await Promise.all(
    Array.from(new Map(campaigns.map((c) => [c.empresa.id, c.empresa])).values()).map(async (emp) => {
      const overrides = emp.resendApiKeyEncrypted
        ? {
            apiKey: decrypt(emp.resendApiKeyEncrypted),
            fromEmail: emp.resendFromEmail ?? undefined,
            webhookSecretSet: !!emp.resendWebhookSecretEncrypted,
          }
        : {};
      const status = await getTrackingStatus(overrides).catch(() => null);
      return { id: emp.id, name: emp.name, status };
    })
  );

  const globalTotal   = campaigns.reduce((s, c) => s + c.sendLogs.length, 0);
  const globalBounces = campaigns.reduce((s, c) => s + c.sendLogs.filter(l => l.bouncedAt).length, 0);
  const globalUnsubs  = campaigns.reduce((s, c) => s + c.sendLogs.filter(l => l.contact.unsubscribed).length, 0);

  // Opens/clicks are only meaningful for campaigns sent WHILE tracking was on.
  // Aggregating over untracked sends would report a misleading 0%.
  const trackedCampaigns = campaigns.filter(c => c.openTrackingAtSend === true);
  const trackedTotal  = trackedCampaigns.reduce((s, c) => s + c.sendLogs.length, 0);
  const trackedOpens  = trackedCampaigns.reduce((s, c) => s + c.sendLogs.filter(l => l.openedAt).length, 0);
  const trackedClicks = trackedCampaigns.reduce((s, c) => s + c.sendLogs.filter(l => l.clickedAt).length, 0);

  const pct  = (n: number, base: number) => base > 0 ? Math.round((n / base) * 100) : 0;
  const hasTracked = trackedTotal > 0;

  // Banner from the per-empresa statuses: green only when every empresa's own
  // domain is tracking; amber when any is inactive; gray when any is unverified.
  const untracked = statuses.filter((s) => s.status && !s.status.active);
  const notVerified = statuses.filter((s) => !s.status || s.status.unknown);
  const allActive = statuses.length > 0 && untracked.length === 0 && notVerified.length === 0;

  const banner =
    notVerified.length > 0 && untracked.length === 0
      ? { icon: HelpCircle, cls: "bg-gray-50 border-gray-200 text-gray-600", iconCls: "text-gray-400",
          title: "Estado de seguimiento no verificado" }
      : allActive
      ? { icon: CheckCircle2, cls: "bg-emerald-50 border-emerald-200 text-emerald-800", iconCls: "text-emerald-500",
          title: "Seguimiento de aperturas y clics activo en todas las empresas" }
      : { icon: AlertTriangle, cls: "bg-amber-50 border-amber-200 text-amber-800", iconCls: "text-amber-500",
          title: `Seguimiento de aperturas y clics inactivo en ${untracked.length} de ${statuses.length} empresas` };
  const BannerIcon = banner.icon;

  const trackingDetails = statuses
    .map((s) => {
      const st = s.status;
      const domain = st?.domainName ? ` (${st.domainName})` : "";
      const state = st?.active ? "activo" : !st || st.unknown ? "no verificado" : "inactivo";
      return `${s.name}${domain}: ${state}`;
    })
    .join(" · ");

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#207029]/50 mb-0.5">Analytics</p>
          <h1 className="text-2xl font-bold text-gray-900">Métricas de envíos</h1>
        </div>
      </div>

      {/* Tracking status banner — per-empresa domains, not a single global check */}
      {statuses.length > 0 && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${banner.cls}`}>
          <BannerIcon className={`w-5 h-5 mt-0.5 shrink-0 ${banner.iconCls}`} />
          <div className="text-sm">
            <p className="font-semibold">{banner.title}</p>
            <p className="opacity-90 mt-0.5">{trackingDetails}</p>
            {!allActive && (
              <p className="opacity-75 mt-1 text-xs">
                Mientras esté inactivo en una empresa, sus aperturas y clics aparecen como “Sin seguimiento”: no
                significa que nadie haya abierto, sino que esos eventos no se están registrando. Los rebotes y las
                bajas sí son datos reales.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Global KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold mt-1" style={{ color: "#207029" }}>{globalTotal.toLocaleString("es-CL")}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">Enviados</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          {hasTracked
            ? <><p className="text-2xl font-bold mt-1" style={{ color: "#3b82f6" }}>{pct(trackedOpens, trackedTotal)}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{trackedOpens} emails</p></>
            : <p className="text-sm font-semibold mt-3 text-gray-400 italic">Sin seguimiento</p>}
          <p className="text-xs text-gray-400 font-medium mt-1">Aperturas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          {hasTracked
            ? <><p className="text-2xl font-bold mt-1" style={{ color: "#8b5cf6" }}>{pct(trackedClicks, trackedTotal)}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{trackedClicks} emails</p></>
            : <p className="text-sm font-semibold mt-3 text-gray-400 italic">Sin seguimiento</p>}
          <p className="text-xs text-gray-400 font-medium mt-1">Clicks</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold mt-1" style={{ color: "#f59e0b" }}>{globalBounces}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pct(globalBounces, globalTotal)}%</p>
          <p className="text-xs text-gray-400 font-medium mt-1">Rebotes</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold mt-1" style={{ color: "#ef4444" }}>{globalUnsubs}</p>
          <p className="text-xs text-gray-400 font-medium mt-1">Dados de baja</p>
        </div>
      </div>

      {/* Per-campaign table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Detalle por campaña</h2>
          <p className="text-xs text-gray-400 mt-0.5">Solo campañas enviadas. Cada campaña indica si tenía el seguimiento de aperturas/clics activo al momento del envío.</p>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No hay campañas enviadas aún.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.map((c) => {
              const total   = c.sendLogs.length;
              const opens   = c.sendLogs.filter(l => l.openedAt).length;
              const clicks  = c.sendLogs.filter(l => l.clickedAt).length;
              const bounces = c.sendLogs.filter(l => l.bouncedAt).length;
              const unsubs  = c.sendLogs.filter(l => l.contact.unsubscribed).length;
              const tracked = c.openTrackingAtSend === true;

              return (
                <div key={c.id} className="px-6 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link href={`/admin/campanas/${c.id}`} className="font-semibold text-gray-800 hover:text-[#207029] transition-colors">
                        {c.subject}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.empresa.name}
                        {c.sentAt && <> · {new Date(c.sentAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tracked
                        ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />Con seguimiento</span>
                        : <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full"><HelpCircle className="w-3.5 h-3.5" />Sin seguimiento</span>}
                      <span className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
                        {total.toLocaleString()} enviados
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Aperturas</span>{tracked && <span className="font-medium">{opens}</span>}
                      </div>
                      {tracked ? <Bar value={opens} max={total} color="#3b82f6" /> : <NoTracking />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Clicks</span>{tracked && <span className="font-medium">{clicks}</span>}
                      </div>
                      {tracked ? <Bar value={clicks} max={total} color="#8b5cf6" /> : <NoTracking />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Rebotes</span><span className="font-medium">{bounces}</span>
                      </div>
                      <Bar value={bounces} max={total} color="#f59e0b" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Dados de baja</span><span className="font-medium">{unsubs}</span>
                      </div>
                      <Bar value={unsubs} max={total} color="#ef4444" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
