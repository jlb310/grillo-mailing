"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Download, Send, RotateCcw, Trash2, Loader2, CheckCircle2, XCircle, Clock, Mail, MailOpen, Eye, FileText, CalendarClock } from "lucide-react";

interface Cert {
  id: string;
  recipientName: string;
  recipientEmail: string;
  role: string;
  horas: number;
  status: "PENDING" | "GENERATING" | "SENT" | "FAILED";
  sentAt: string | null;
  openedAt: string | null;
  error: string | null;
}
interface Batch {
  id: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "PROCESSING" | "DONE";
  scheduledAt: string | null;
  processing: boolean;
  counts: { total: number; SENT: number; FAILED: number; PENDING: number; GENERATING: number; OPENED: number };
  certificates: Cert[];
}

const STATUS: Record<Cert["status"], { label: string; cls: string; Icon: React.ElementType }> = {
  PENDING:    { label: "Pendiente",  cls: "text-gray-500",     Icon: Clock },
  GENERATING: { label: "Generando",  cls: "text-amber-600",    Icon: Loader2 },
  SENT:       { label: "Enviado",    cls: "text-emerald-600",  Icon: CheckCircle2 },
  FAILED:     { label: "Fallido",    cls: "text-red-600",      Icon: XCircle },
};

export default function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [schedAt, setSchedAt] = useState("");
  const [minSched, setMinSched] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"cert" | "email">("cert");
  const [preview, setPreview] = useState<{ certId: string; recipientName: string; emailHtml: string; certHtml: string } | null>(null);
  const [previewErr, setPreviewErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/certificados/${batchId}`);
    if (res.ok) setBatch(await res.json());
  }, [batchId]);

  // Initial fetch — setState lives in the .then callback (not synchronously in
  // the effect body) to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    fetch(`/api/certificados/${batchId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setBatch(d); });
  }, [batchId]);

  // Earliest selectable schedule time (now + 1 min). Deferred to a microtask so
  // the impure Date.now() isn't called during render and setState isn't synchronous
  // in the effect body (matches the initial-fetch pattern above).
  useEffect(() => {
    Promise.resolve().then(() =>
      setMinSched(new Date(Date.now() + 60_000).toISOString().slice(0, 16))
    );
  }, []);

  // Poll while there is in-flight work.
  useEffect(() => {
    if (!batch) return;
    const active = batch.processing || batch.counts.PENDING > 0 || batch.counts.GENERATING > 0;
    if (!active) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [batch, load]);

  async function action(path: string) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/certificados/${batchId}${path}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function openPreview() {
    setPreviewErr("");
    setPreviewTab("cert");
    setPreviewOpen(true);
    if (!preview) {
      try {
        const res = await fetch(`/api/certificados/${batchId}/preview`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error");
        setPreview(data);
      } catch (err) {
        setPreviewErr(err instanceof Error ? err.message : "Error");
      }
    }
  }

  async function sendTest() {
    setTestMsg("");
    setError("");
    setTestBusy(true);
    try {
      const res = await fetch(`/api/certificados/${batchId}/prueba`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setTestMsg(`Prueba enviada a ${data.sentTo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setTestBusy(false);
    }
  }

  async function schedule(scheduledAt: string | null) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/certificados/${batchId}/programar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setSchedAt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function removeCert(certId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name} de este lote?`)) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/certificados/cert/${certId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este lote de certificados?")) return;
    setBusy(true);
    const res = await fetch(`/api/certificados/${batchId}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/certificados");
    else setBusy(false);
  }

  if (!batch) return <div className="p-6 text-gray-500">Cargando…</div>;

  const { counts } = batch;
  const done = counts.SENT + counts.FAILED;
  const pct = counts.total > 0 ? Math.round((done / counts.total) * 100) : 0;
  const hasPending = counts.PENDING > 0 || counts.GENERATING > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/certificados">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1 truncate">{batch.name}</h1>
        <Button variant="ghost" size="sm" onClick={remove} disabled={busy} className="text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-gray-600">{counts.total} destinatarios</span>
            <span className="text-emerald-600">{counts.SENT} enviados</span>
            {counts.SENT > 0 && (
              <span className="text-[#207029]">
                {counts.OPENED} abiertos ({Math.round((counts.OPENED / counts.SENT) * 100)}%)
              </span>
            )}
            {counts.FAILED > 0 && <span className="text-red-600">{counts.FAILED} fallidos</span>}
            {hasPending && <span className="text-amber-600">{counts.PENDING + counts.GENERATING} pendientes</span>}
          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#207029] transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={openPreview} variant="outline">
              <Eye className="w-4 h-4 mr-2" /> Vista previa
            </Button>
            {hasPending && (
              <Button onClick={() => action("/enviar")} disabled={busy || batch.processing} className="bg-[#207029] hover:bg-[#005f12] text-white">
                {(busy || batch.processing) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {batch.processing ? "Procesando…" : "Generar y enviar"}
              </Button>
            )}
            {counts.FAILED > 0 && (
              <Button onClick={() => action("/reintentar")} disabled={busy || batch.processing} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" /> Reintentar fallidos
              </Button>
            )}
          </div>

          {hasPending && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Programar envío</p>
              {batch.status === "SCHEDULED" && batch.scheduledAt ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#207029]">
                    <CalendarClock className="w-4 h-4" />
                    Programado para {new Date(batch.scheduledAt).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
                  </span>
                  <Button onClick={() => schedule(null)} disabled={busy} variant="outline" size="sm">
                    Cancelar programación
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    El lote se generará y enviará automáticamente en la fecha y hora que elijas.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={schedAt}
                      min={minSched}
                      onChange={(e) => setSchedAt(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button onClick={() => schedule(new Date(schedAt).toISOString())} disabled={busy || !schedAt} variant="outline">
                      <CalendarClock className="w-4 h-4 mr-2" /> Programar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Enviar correo de prueba</p>
            <p className="text-xs text-gray-500">
              Envía el correo con el PDF adjunto del primer certificado del lote a la dirección que indiques.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                placeholder="correo@ejemplo.cl"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={sendTest} disabled={testBusy || !testEmail.trim()} variant="outline">
                {testBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Enviar prueba
              </Button>
            </div>
            {testMsg && <p className="text-sm text-emerald-600">{testMsg}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium text-right">PDF</th>
                  <th className="px-4 py-2.5 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {batch.certificates.map((c) => {
                  const s = STATUS[c.status];
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-2.5 text-gray-900">{c.recipientName}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.recipientEmail}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2.5">
                          <span className={`inline-flex items-center gap-1.5 ${s.cls}`} title={c.error ?? undefined}>
                            <s.Icon className={`w-4 h-4 ${c.status === "GENERATING" ? "animate-spin" : ""}`} />
                            {s.label}
                          </span>
                          {c.openedAt && (
                            <span className="inline-flex items-center gap-1 text-[#207029]"
                                  title={`Abierto el ${new Date(c.openedAt).toLocaleString("es-CL")}`}>
                              <MailOpen className="w-4 h-4" /> Abierto
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a href={`/api/certificados/cert/${c.id}`} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-[#207029] hover:underline">
                          <Download className="w-4 h-4" />
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => removeCert(c.id, c.recipientName)} disabled={busy}
                                title="Eliminar de la lista"
                                className="inline-flex items-center text-gray-400 hover:text-red-600 disabled:opacity-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-6xl w-[96vw]">
          <DialogHeader>
            <DialogTitle>
              Vista previa{preview ? ` — ${preview.recipientName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Button size="sm" variant={previewTab === "cert" ? "default" : "outline"} onClick={() => setPreviewTab("cert")}>
              <FileText className="w-4 h-4 mr-2" /> Certificado
            </Button>
            <Button size="sm" variant={previewTab === "email" ? "default" : "outline"} onClick={() => setPreviewTab("email")}>
              <Mail className="w-4 h-4 mr-2" /> Correo
            </Button>
          </div>

          {previewErr && <p className="text-sm text-red-600">{previewErr}</p>}

          {!preview && !previewErr && (
            <div className="flex items-center justify-center h-[72vh] text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…
            </div>
          )}

          {preview && (
            <>
              <div className={`space-y-2 ${previewTab === "cert" ? "" : "hidden"}`}>
                <div className="w-full overflow-auto rounded border bg-gray-100" style={{ height: "72vh" }}>
                  <iframe
                    srcDoc={preview.certHtml}
                    className="block bg-white shadow mx-auto"
                    style={{ width: "1123px", height: "794px", border: "none" }}
                    title="certificado"
                  />
                </div>
                <a
                  href={`/api/certificados/cert/${preview.certId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#207029] hover:underline"
                >
                  <Download className="w-4 h-4" /> Descargar PDF
                </a>
              </div>

              <iframe
                srcDoc={preview.emailHtml}
                className={`w-full rounded border bg-white ${previewTab === "email" ? "" : "hidden"}`}
                style={{ height: "72vh" }}
                title="correo"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
