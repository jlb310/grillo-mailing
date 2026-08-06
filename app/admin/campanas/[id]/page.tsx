"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Edit, Users, Eye, FlaskConical, Upload, Mail, MousePointerClick, AlertTriangle, Bell, X, Plus, Trash2, Clock, CalendarClock, Copy } from "lucide-react";
import SelectorGrupos from "./selector-grupos";

interface Metrics {
  total: number;
  sentCount: number;
  pendingCount: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubs: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface SendLog {
  id: string;
  status: string;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  contact: { name: string; email: string; unsubscribed: boolean };
}

interface Campaign {
  id: string;
  subject: string;
  status: string;
  sentAt: string | null;
  scheduledAt: string | null;
  htmlBody: string;
  notifyEmails: string[];
  empresa: { id: string; name: string };
  sendLogs: SendLog[];
  contactGroups?: { id: string; name: string; _count: { contacts: number } }[];
  metrics?: Metrics;
}

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador", SCHEDULED: "Programada",
  SENDING: "Enviando...", SENT: "Enviada",
};
const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-yellow-100 text-yellow-700",
  SENDING: "bg-orange-100 text-orange-700",
  SENT: "bg-green-100 text-green-700",
};

function StatCard({ label, value, sub, icon, color }: { label: string; value: number | string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampanaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState("");
  const [testEmails, setTestEmails] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [notifyEmails, setNotifyEmails] = useState<string[]>([]);
  const [notifyInput, setNotifyInput] = useState("");
  const [notifySaving, setNotifySaving] = useState(false);
  const [scheduleInput, setScheduleInput] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [minSchedule] = useState(
    () => new Date(Date.now() + 60_000).toISOString().slice(0, 16)
  );

  useEffect(() => {
    fetch(`/api/campanas/${id}`).then((r) => r.json()).then((data) => {
      setCampaign(data);
      setNotifyEmails(data.notifyEmails ?? []);
    });
  }, [id]);

  // Poll every 30s while sending
  useEffect(() => {
    if (campaign?.status !== "SENDING") return;
    const interval = setInterval(() => {
      fetch(`/api/campanas/${id}`).then((r) => r.json()).then(setCampaign);
    }, 30_000);
    return () => clearInterval(interval);
  }, [campaign?.status, id]);

  async function handleTestSend() {
    const emails = testEmails.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) { setMsg("Ingresa al menos un email"); return; }
    setTestSending(true); setMsg("");
    try {
      const res = await fetch(`/api/campanas/${id}/prueba`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(`Error: ${data.error}`);
      else { setMsg(`✅ Prueba enviada a ${data.sent} dirección${data.sent !== 1 ? "es" : ""}`); setShowTest(false); }
    } catch { setMsg("Error al enviar prueba"); }
    setTestSending(false);
  }

  async function handleImport(file: File) {
    if (!campaign) return;
    setImporting(true); setMsg("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/empresas/${campaign.empresa.id}/contactos`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        const parts = [`${data.imported} contactos importados a la empresa`];
        if (data.duplicates) parts.push(`${data.duplicates} duplicados omitidos`);
        if (data.invalid) parts.push(`${data.invalid} inválidos descartados`);
        setMsg(`✅ ${parts.join(" · ")}`);
      }
      else setMsg(`Error: ${data.error ?? "Error al importar"}`);
    } catch { setMsg("Error al importar"); }
    setImporting(false);
    if (importRef.current) importRef.current.value = "";
  }

  async function handleSend() {
    if (!confirm(`¿Enviar esta campaña?\n\nEl envío se procesará en segundo plano en lotes de 100 con 5 minutos de pausa entre cada uno. Esta acción no se puede deshacer.`)) return;
    setSending(true); setMsg("");
    try {
      const res = await fetch(`/api/campanas/${id}/envios`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMsg(`Error: ${data.error}`); setSending(false); return; }
      setMsg(`✅ Envío iniciado — ${data.total} contactos en cola. La página se actualizará automáticamente.`);
      fetch(`/api/campanas/${id}`).then((r) => r.json()).then(setCampaign);
    } catch { setMsg("Error al enviar"); }
    setSending(false);
  }

  async function handleCleanLogs() {
    if (!confirm(`¿Limpiar los ${m?.pendingCount?.toLocaleString()} registros sin enviar?\n\nEsto elimina solo los logs sin resendId (nunca llegaron a Resend). Los contactos que ya recibieron el email quedan intactos. Después podrás usar "Enviar ahora" para completar el resto.`)) return;
    try {
      const res = await fetch(`/api/campanas/${id}/limpiar-logs`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMsg(`Error: ${data.error}`);
      else { setMsg(`✅ ${data.deleted.toLocaleString()} registros limpiados.`); fetch(`/api/campanas/${id}`).then(r => r.json()).then(setCampaign); }
    } catch { setMsg("Error al limpiar"); }
  }

  async function handleResetSending() {
    if (!confirm("¿Reiniciar el estado del envío? Esto pone la campaña en borrador para que pueda reenviarse.")) return;
    try {
      const res = await fetch(`/api/campanas/${id}/envios`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setMsg(`Error: ${data.error}`);
      else { setMsg("Estado reiniciado a borrador."); fetch(`/api/campanas/${id}`).then(r => r.json()).then(setCampaign); }
    } catch { setMsg("Error al reiniciar"); }
  }

  async function addNotifyEmail() {
    const email = notifyInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (notifyEmails.includes(email)) { setNotifyInput(""); return; }
    const updated = [...notifyEmails, email];
    setNotifyEmails(updated);
    setNotifyInput("");
    setNotifySaving(true);
    await fetch(`/api/campanas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyEmails: updated }),
    });
    setNotifySaving(false);
  }

  async function removeNotifyEmail(email: string) {
    const updated = notifyEmails.filter(e => e !== email);
    setNotifyEmails(updated);
    await fetch(`/api/campanas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyEmails: updated }),
    });
  }

  async function handleSchedule() {
    if (!scheduleInput) { setMsg("Seleccioná una fecha y hora"); return; }
    setScheduling(true); setMsg("");
    const res = await fetch(`/api/campanas/${id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date(scheduleInput).toISOString() }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(`Error: ${data.error}`);
    else {
      setMsg("✅ Envío programado.");
      fetch(`/api/campanas/${id}`).then(r => r.json()).then(setCampaign);
    }
    setScheduling(false);
  }

  async function handleCancelSchedule() {
    if (!confirm("¿Cancelar el envío programado? La campaña vuelve a borrador.")) return;
    const res = await fetch(`/api/campanas/${id}/schedule`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setMsg(`Error: ${data.error}`);
    else { setMsg("Programación cancelada."); fetch(`/api/campanas/${id}`).then(r => r.json()).then(setCampaign); }
  }

  async function handleResume() {
    if (!confirm("¿Continuar el envío a los contactos pendientes?")) return;
    setSending(true); setMsg("");
    try {
      const res = await fetch(`/api/campanas/${id}/envios`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMsg(`Error: ${data.error}`); setSending(false); return; }
      setMsg(`✅ Reanudado — ${data.total} correos pendientes en cola.`);
      fetch(`/api/campanas/${id}`).then(r => r.json()).then(setCampaign);
    } catch { setMsg("Error al reanudar"); }
    setSending(false);
  }

  if (!campaign) return <div className="p-6 text-gray-400">Cargando...</div>;

  const m = campaign.metrics;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/campanas" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{campaign.subject}</h1>
            <p className="text-sm text-gray-500">{campaign.empresa.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColors[campaign.status]}`}>
            {statusLabel[campaign.status]}
          </span>
          <Link href={`/admin/campanas/nueva?edit=${id}`}>
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" /> Editar</Button>
          </Link>
          <Button
            variant="outline" size="sm"
            disabled={cloning}
            onClick={async () => {
              setCloning(true); setMsg("");
              const res = await fetch(`/api/campanas/${id}/clonar`, { method: "POST" });
              const data = await res.json();
              if (!res.ok) { setMsg(`Error: ${data.error}`); setCloning(false); return; }
              router.push(`/admin/campanas/nueva?edit=${data.id}`);
            }}
          >
            <Copy className="w-4 h-4 mr-1" /> {cloning ? "Clonando..." : "Clonar"}
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={async () => {
              if (!confirm(`¿Eliminar la campaña "${campaign.subject}"? Esta acción no se puede deshacer.`)) return;
              const res = await fetch(`/api/campanas/${id}`, { method: "DELETE" });
              if (res.ok) router.push("/admin/campanas");
              else { const d = await res.json(); setMsg(`Error: ${d.error}`); }
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Eliminar
          </Button>
          <Button onClick={() => setPreview(!preview)} variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" /> {preview ? "Ocultar" : "Preview"}
          </Button>
          <Button onClick={() => setShowTest(!showTest)} variant="outline" size="sm">
            <FlaskConical className="w-4 h-4 mr-1" /> Enviar prueba
          </Button>
          {campaign.status === "SENDING" && (
            <Button onClick={handleResetSending} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
              Reiniciar envío atascado
            </Button>
          )}
          {campaign.status !== "SENT" && campaign.status !== "SENDING" && (m?.pendingCount ?? 0) === 0 && (
            <Button onClick={handleSend} disabled={sending} className="bg-[#207029] hover:bg-[#005f12] text-white">
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Enviando..." : "Enviar ahora"}
            </Button>
          )}
          {campaign.status !== "SENDING" && (m?.pendingCount ?? 0) > 0 && (
            <Button onClick={handleResume} disabled={sending} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Enviando..." : `Completar envío (${m!.pendingCount} pendientes)`}
            </Button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}

      {showTest && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">Enviar email de prueba</p>
          <p className="text-xs text-amber-600">Separa múltiples emails con coma o espacio. El asunto llevará el prefijo [PRUEBA].</p>
          <div className="flex gap-2">
            <input type="text" value={testEmails} onChange={(e) => setTestEmails(e.target.value)}
              placeholder="email1@ejemplo.cl, email2@ejemplo.cl"
              className="flex-1 border border-amber-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <Button onClick={handleTestSend} disabled={testSending} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
              {testSending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      )}

      {preview && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Preview del email</CardTitle></CardHeader>
          <CardContent>
            <iframe srcDoc={campaign.htmlBody} className="w-full rounded border" style={{ height: 500 }} title="preview" />
          </CardContent>
        </Card>
      )}

      {/* Send progress bar — visible when there are logs */}
      {m && m.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso del envío</span>
            <span className="text-sm font-semibold text-gray-900">
              {m.sentCount.toLocaleString()} / {m.total.toLocaleString()} entregados
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${m.total > 0 ? Math.round((m.sentCount / m.total) * 100) : 0}%`, backgroundColor: "#207029" }}
            />
          </div>
          {m.pendingCount > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-amber-600">
                {m.pendingCount.toLocaleString()} registros pendientes
                {m.pendingCount > m.total * 0.5 && m.sentCount > 0 && " (posibles duplicados)"}
              </p>
              {campaign.status !== "SENDING" && m.pendingCount > 2500 && (
                <button
                  onClick={handleCleanLogs}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Limpiar registros duplicados
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule panel */}
      {campaign.status === "DRAFT" && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Programar envío</span>
            </div>
            <p className="text-xs text-gray-400">Elegí una fecha y hora para que el envío comience automáticamente.</p>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
                min={minSchedule}
                className="flex-1 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#207029]"
              />
              <Button
                size="sm"
                disabled={scheduling}
                onClick={handleSchedule}
                className="bg-[#207029] hover:bg-[#005f12] text-white shrink-0"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {scheduling ? "Programando..." : "Programar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.status === "SCHEDULED" && campaign.scheduledAt && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-50">
                  <CalendarClock className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Envío programado</p>
                  <p className="text-sm text-gray-500">
                    {new Date(campaign.scheduledAt).toLocaleString("es-CL", {
                      weekday: "long", day: "numeric", month: "long",
                      year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelSchedule}
                className="text-red-500 border-red-200 hover:bg-red-50 shrink-0"
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar programación
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Enviados a Resend"
          value={m?.sentCount ?? 0}
          sub={m && m.total > 0 ? `de ${m.total} total` : undefined}
          icon={<Mail className="w-4 h-4 text-[#207029]" />}
          color="bg-teal-50"
        />
        <StatCard
          label="Aperturas"
          value={m ? `${m.openRate}%` : "—"}
          sub={m ? `${m.opens} de ${m.total}` : undefined}
          icon={<Eye className="w-4 h-4 text-blue-500" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Clicks"
          value={m ? `${m.clickRate}%` : "—"}
          sub={m ? `${m.clicks} de ${m.total}` : undefined}
          icon={<MousePointerClick className="w-4 h-4 text-purple-500" />}
          color="bg-purple-50"
        />
        <StatCard
          label="Rebotes / Bajas"
          value={m ? `${m.bounces} / ${m.unsubs}` : "—"}
          sub={m ? `${m.bounceRate}% rebotes` : undefined}
          icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          color="bg-orange-50"
        />
      </div>

      {/* Contactos + grupos */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <Link href={`/admin/empresas/${campaign.empresa.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                  Ver empresa →
                </Link>
              </div>
              <Button variant="outline" size="sm" disabled={importing} onClick={() => importRef.current?.click()} className="h-7 text-xs gap-1.5">
                <Upload className="w-3 h-3" />
                {importing ? "Importando..." : "Agregar contactos"}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">CSV o Excel — se agregan a la empresa sin duplicar</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <SelectorGrupos campaignId={campaign.id} empresaId={campaign.empresa.id} disabled={campaign.status === "SENT"} />
          </CardContent>
        </Card>
      </div>

      {/* Notificaciones de envío */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Notificaciones de envío</span>
            {notifySaving && <span className="text-xs text-gray-400">Guardando...</span>}
          </div>
          <p className="text-xs text-gray-400">Estos correos recibirán un resumen automático al finalizar el envío.</p>

          {notifyEmails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {notifyEmails.map(email => (
                <span key={email} className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2.5 py-1">
                  {email}
                  <button onClick={() => removeNotifyEmail(email)} className="hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="email"
              value={notifyInput}
              onChange={(e) => setNotifyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNotifyEmail(); } }}
              placeholder="nombre@empresa.cl"
              className="flex-1 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#207029]"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={addNotifyEmail}>
              <Plus className="w-3 h-3" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Destinatarios */}
      {campaign.sendLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Destinatarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y max-h-96 overflow-y-auto">
              {campaign.sendLogs.map((log) => (
                <div key={log.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{log.contact.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{log.contact.email}</span>
                    {log.contact.unsubscribed && <span className="ml-2 text-xs text-red-400">baja</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {log.openedAt  && <span className="text-blue-500">📬 abierto</span>}
                    {log.clickedAt && <span className="text-purple-500">🔗 click</span>}
                    {log.bouncedAt && <span className="text-red-400">⚠️ rebote</span>}
                    {!log.openedAt && !log.clickedAt && !log.bouncedAt && <span>enviado</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
