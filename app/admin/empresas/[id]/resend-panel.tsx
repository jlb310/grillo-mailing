"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Check } from "lucide-react";

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
        Cuando están configuradas, las campañas de esta empresa se envían desde su propio dominio con su propia cuenta Resend en vez de la cuenta de Grillo.
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
          API Key de Resend
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
          En la cuenta Resend de la empresa, crear un webhook a <code className="bg-gray-50 px-1 rounded">/api/webhooks/resend</code> (eventos: email.opened, email.clicked, email.bounced) y pegar aquí el secreto que entrega.
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

      <Button size="sm" className="h-8 text-xs bg-[#207029] hover:bg-[#005f12] text-white" disabled={saving} onClick={save}>
        <Mail className="w-3.5 h-3.5 mr-1.5" />
        {saving ? "Guardando..." : "Guardar configuración de envío"}
      </Button>
    </div>
  );
}
