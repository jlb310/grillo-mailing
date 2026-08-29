"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Check, CheckCircle2, AlertTriangle, HelpCircle, Search, Zap } from "lucide-react";

interface DnsRecord { record: string; type: string; name: string; value: string; status: string }

interface TrackingStatus {
  active: boolean;
  unknown: boolean;
  reason: string;
  pendingTrackingRecords: DnsRecord[];
}

interface SetupResult {
  ok?: boolean;
  error?: string;
  steps?: string[];
  pendingTrackingRecords?: DnsRecord[];
}

interface ResendPanelProps {
  empresaId: string;
  resendFromName: string | null;
  resendFromEmail: string | null;
  resendApiKeyConfigured: boolean;
  resendWebhookSecretConfigured: boolean;
}

export default function ResendPanel({
  empresaId,
  resendFromName,
  resendFromEmail,
  resendApiKeyConfigured,
  resendWebhookSecretConfigured,
}: ResendPanelProps) {
  const router = useRouter();
  const [fromName, setFromName] = useState(resendFromName ?? "");
  const [fromEmail, setFromEmail] = useState(resendFromEmail ?? "");
  // Secrets never come back from the server once saved — blank inputs mean
  // "leave as is"; typing something means "replace it".
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [setup, setSetup] = useState<SetupResult | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  async function checkTracking() {
    setChecking(true);
    setTracking(null);
    setSetup(null);
    try {
      const res = await fetch(`/api/empresas/${empresaId}/tracking-status`);
      setTracking(await res.json());
    } catch {
      setTracking({ active: false, unknown: true, reason: "No se pudo verificar el estado.", pendingTrackingRecords: [] });
    }
    setChecking(false);
  }

  async function activateTracking() {
    const cuenta = resendApiKeyConfigured ? "la cuenta de Resend propia de esta empresa" : "la cuenta de Resend de Grillo";
    if (!confirm(`Esto modifica ${cuenta}: activa el seguimiento en el dominio ${resendFromEmail ?? ""} y le asigna un subdominio de seguimiento. ¿Continuar?`)) return;
    setSettingUp(true);
    setSetup(null);
    setTracking(null);
    try {
      const res = await fetch(`/api/empresas/${empresaId}/tracking-status`, { method: "POST" });
      const data: SetupResult & { status?: TrackingStatus } = await res.json();
      setSetup(data);
      if (data.status) setTracking(data.status);
    } catch {
      setSetup({ error: "No se pudo completar la configuración." });
    }
    setSettingUp(false);
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setError("");
    const body: Record<string, string> = {
      resendFromName: fromName,
      resendFromEmail: fromEmail,
    };
    if (apiKey.trim()) body.resendApiKey = apiKey.trim();
    if (webhookSecret.trim()) body.resendWebhookSecret = webhookSecret.trim();

    const res = await fetch(`/api/empresas/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    setApiKey("");
    setWebhookSecret("");
    router.refresh();
  }

  async function clearField(field: "resendApiKey" | "resendWebhookSecret") {
    if (!confirm("¿Quitar esta credencial? Los envíos volverán a usar la cuenta de Grillo.")) return;
    await fetch(`/api/empresas/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: "" }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Con solo indicar el remitente, las campañas salen desde el dominio de esta empresa usando la cuenta de Resend de Grillo (el dominio debe estar verificado ahí, con sus registros DNS en la zona del cliente). La API key de abajo es opcional: solo para empresas que pagan su propia cuenta de Resend.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Nombre del remitente</Label>
          <Input placeholder="Ej: Lenyes" value={fromName} onChange={(e) => setFromName(e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Email del remitente</Label>
          <Input placeholder="hola@lenyes.cl" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500 flex items-center gap-1.5">
          API Key de Resend <span className="text-gray-400 font-normal">(opcional — solo si la empresa paga su propia cuenta)</span>
          {resendApiKeyConfigured && <span className="inline-flex items-center gap-0.5 text-[#207029]"><Check className="w-3 h-3" /> configurada</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={resendApiKeyConfigured ? "•••••••••••• (dejar vacío para no cambiar)" : "re_..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="text-sm flex-1"
          />
          {resendApiKeyConfigured && (
            <Button variant="outline" size="sm" className="h-9 text-xs text-red-500 hover:text-red-600" onClick={() => clearField("resendApiKey")}>
              Quitar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500 flex items-center gap-1.5">
          Webhook signing secret (whsec_...)
          {resendWebhookSecretConfigured && <span className="inline-flex items-center gap-0.5 text-[#207029]"><Check className="w-3 h-3" /> configurado</span>}
        </Label>
        <p className="text-[11px] text-gray-400">
          Solo para empresas con cuenta propia: en SU cuenta Resend, crear un webhook a <code className="bg-gray-50 px-1 rounded">/api/webhooks/resend</code> (eventos: email.opened, email.clicked, email.bounced) y pegar aquí el secreto que entrega. Con la cuenta de Grillo el webhook es compartido y su secreto vive en el entorno (SVIX_SECRET).
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={resendWebhookSecretConfigured ? "•••••••••••• (dejar vacío para no cambiar)" : "whsec_..."}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="text-sm flex-1"
          />
          {resendWebhookSecretConfigured && (
            <Button variant="outline" size="sm" className="h-9 text-xs text-red-500 hover:text-red-600" onClick={() => clearField("resendWebhookSecret")}>
              Quitar
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 text-xs bg-[#207029] hover:bg-[#005f12] text-white" disabled={saving} onClick={save}>
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          {saving ? "Guardando..." : "Guardar configuración de envío"}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={checking} onClick={checkTracking}>
          <Search className="w-3.5 h-3.5 mr-1.5" />
          {checking ? "Verificando..." : "Verificar seguimiento de aperturas/clics"}
        </Button>
        {resendFromEmail && (
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={settingUp} onClick={activateTracking}>
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {settingUp ? "Configurando..." : "Activar seguimiento"}
          </Button>
        )}
      </div>

      {setup && (
        <div className={`text-xs rounded-md border p-2.5 space-y-1.5 ${setup.error ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
          {setup.error ? (
            <p>{setup.error}</p>
          ) : (
            <>
              <ul className="space-y-0.5">
                {setup.steps?.map((s, i) => <li key={i}>✓ {s}</li>)}
              </ul>
              {setup.pendingTrackingRecords && setup.pendingTrackingRecords.length > 0 && (
                <div className="pt-1 border-t border-blue-200 space-y-1">
                  <p className="font-semibold">Falta agregar estos registros en el DNS del dominio:</p>
                  <ul className="space-y-0.5 font-mono text-[11px]">
                    {setup.pendingTrackingRecords.map((r, i) => (
                      <li key={i}>{r.type} {r.name} → {r.value}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] opacity-80">Hasta que Resend los verifique, no se miden aperturas ni clics.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tracking && (
        <div
          className={`flex items-start gap-2 text-xs rounded-md border p-2.5 ${
            tracking.unknown
              ? "bg-gray-50 border-gray-200 text-gray-600"
              : tracking.active
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {tracking.unknown ? (
            <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
          ) : tracking.active ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
          )}
          <div className="space-y-1">
            <p>{tracking.reason}</p>
            {tracking.pendingTrackingRecords.length > 0 && (
              <ul className="space-y-0.5 text-[11px] opacity-80">
                {tracking.pendingTrackingRecords.map((r, i) => (
                  <li key={i}>{r.type} {r.name} → {r.value} ({r.status})</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
