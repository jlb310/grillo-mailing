"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { KeyRound, Loader2 } from "lucide-react"

/**
 * Conecta un cliente con SU cuenta de Resend.
 *
 * La key que se pega acá nunca vuelve: el servidor la guarda cifrada y solo
 * responde si hay una configurada o no. Por eso el campo siempre arranca vacío,
 * incluso cuando ya existe una guardada.
 */
export function ResendCredentialsDialog({
  organizationId,
  organizationName,
  hasApiKey,
  hasWebhookSecret,
}: {
  organizationId: string
  organizationName: string
  hasApiKey: boolean
  hasWebhookSecret: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${organizationId}/resend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, webhookSecret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar")

      setApiKey("")
      setWebhookSecret("")
      setOpen(false)
      router.refresh()
      toast.success(`${organizationName} enviará desde su propia cuenta de Resend`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      const res = await fetch(`/api/organizations/${organizationId}/resend`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("No se pudo desconectar")

      setOpen(false)
      router.refresh()
      toast.success(`${organizationName} vuelve a la cuenta de la agencia`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo desconectar")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-9 rounded-xl text-xs font-medium gap-2 border-border"
          />
        }
      >
        <KeyRound className="w-3.5 h-3.5" />
        {hasApiKey ? "Cuenta propia" : "Cuenta de la agencia"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            Resend de {organizationName}
          </DialogTitle>
          <DialogDescription>
            {hasApiKey
              ? "Este cliente ya tiene su cuenta conectada. Pega una key nueva solo si quieres reemplazarla."
              : "Hoy este cliente envía por la cuenta de la agencia. Conecta la suya para separar cuota, factura y reputación de envío."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm text-foreground-muted">
              API key
            </Label>
            <Input
              id="apiKey"
              type="password"
              autoComplete="off"
              placeholder="re_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20 font-mono text-sm"
            />
            <p className="text-xs text-foreground-subtle">
              Tiene que ser de tipo <strong>Full access</strong>: las de solo envío no pueden dar de
              alta dominios. La probamos contra Resend antes de guardarla.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret" className="text-sm text-foreground-muted">
              Secreto del webhook <span className="text-foreground-subtle">(opcional)</span>
            </Label>
            <Input
              id="webhookSecret"
              type="password"
              autoComplete="off"
              placeholder={hasWebhookSecret ? "Ya hay uno guardado" : "whsec_..."}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20 font-mono text-sm"
            />
            <p className="text-xs text-foreground-subtle">
              Sin esto no se pueden validar los eventos de aperturas y rebotes que manda esta cuenta.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            {hasApiKey && (
              <Button
                type="button"
                variant="outline"
                onClick={remove}
                disabled={removing || saving}
                className="h-11 rounded-xl text-sm font-medium border-border"
              >
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desconectar"}
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving || removing}
              className="flex-1 h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Probando la key…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
