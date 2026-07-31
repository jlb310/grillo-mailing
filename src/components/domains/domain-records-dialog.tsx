"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Copy, Loader2, RefreshCw } from "lucide-react"

export interface DnsRecord {
  record: string
  type: string
  name: string
  host: string
  value: string
  ttl: string
  priority?: number
  status: string
}

export interface DomainDetail {
  domain: {
    id: string
    name: string
    status: string
    spfVerified: boolean
    dkimVerified: boolean
    dmarcVerified: boolean
  }
  region: string | null
  records: DnsRecord[]
  linkedToResend: boolean
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Sin permiso de portapapeles (o contexto no seguro): que al menos se
      // entere de por qué no pasó nada.
      toast.error("El navegador bloqueó el portapapeles, copia el valor a mano")
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label={`Copiar ${label}`}
      className="shrink-0 text-foreground-subtle hover:text-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  )
}

function RecordStatus({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <Badge className="bg-success/10 text-success hover:bg-success/10 rounded-lg px-2 py-0.5 text-xs font-medium">
        Verificado
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge className="bg-danger/10 text-danger hover:bg-danger/10 rounded-lg px-2 py-0.5 text-xs font-medium">
        Fallido
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-warning border-warning/30 rounded-lg px-2 py-0.5 text-xs font-medium">
      Pendiente
    </Badge>
  )
}

/**
 * Solo pinta. Quien abre el diálogo es también quien carga el detalle, así no
 * hace falta un efecto que dispare el fetch al montar.
 */
export function DomainRecordsDialog({
  open,
  onOpenChange,
  detail,
  loading = false,
  onDetailChange,
  onSynced,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: DomainDetail | null
  loading?: boolean
  onDetailChange: (detail: DomainDetail) => void
  onSynced?: () => void
}) {
  const [verifying, setVerifying] = useState(false)

  const verify = async () => {
    if (!detail) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/domains/${detail.domain.id}/verify`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo verificar")
      onDetailChange(data)
      onSynced?.()

      if (data.domain.status === "VERIFIED") {
        toast.success("Dominio verificado, ya puedes enviar campañas")
      } else {
        toast.info("Resend está revisando los registros. Puede tardar unos minutos.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            Registros DNS {detail ? `de ${detail.domain.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Carga estos registros en el DNS del dominio y luego pulsa «Verificar». En paneles tipo
            cPanel escribe solo la columna <strong>Nombre</strong>: el panel agrega el dominio solo.
          </DialogDescription>
        </DialogHeader>

        {loading && !detail && (
          <div className="py-12 flex items-center justify-center text-foreground-subtle">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {detail && !detail.linkedToResend && (
          <p className="text-sm text-warning bg-warning/10 rounded-xl p-4">
            Este dominio no está en la cuenta de Resend de su organización, así que no hay registros
            que mostrar. Si lo diste de alta en otra cuenta, corrige la API key de la organización;
            si no existe en ninguna, bórralo y vuelve a agregarlo.
          </p>
        )}

        {detail && detail.records.length > 0 && (
          <div className="space-y-3">
            {detail.records.map((record) => (
              <div
                key={`${record.type}-${record.name}-${record.record}`}
                className="border border-border rounded-xl p-4 space-y-3 bg-background-elev"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-xs font-mono">
                      {record.type}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{record.record}</span>
                    {record.priority !== undefined && (
                      <span className="text-xs text-foreground-subtle">
                        prioridad {record.priority}
                      </span>
                    )}
                  </div>
                  <RecordStatus status={record.status} />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-subtle w-16 shrink-0">Nombre</span>
                    <code className="text-xs font-mono text-foreground bg-background-muted rounded-lg px-2 py-1.5 flex-1 break-all">
                      {record.host}
                    </code>
                    <CopyButton value={record.host} label="el nombre" />
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-foreground-subtle w-16 shrink-0 pt-1.5">Valor</span>
                    <code className="text-xs font-mono text-foreground bg-background-muted rounded-lg px-2 py-1.5 flex-1 break-all">
                      {record.value}
                    </code>
                    <CopyButton value={record.value} label="el valor" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-subtle w-16 shrink-0">TTL</span>
                    <span className="text-xs text-foreground-subtle">{record.ttl}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {detail && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-foreground-subtle">
              {detail.region ? `Región de envío: ${detail.region}. ` : ""}
              El DNS puede tardar hasta una hora en propagarse.
            </p>
            <Button
              type="button"
              onClick={verify}
              disabled={verifying || !detail.linkedToResend}
              className="h-10 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Verificar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
