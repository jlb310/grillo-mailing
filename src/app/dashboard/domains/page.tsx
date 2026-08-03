"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  DomainRecordsDialog,
  type DomainDetail,
} from "@/components/domains/domain-records-dialog"
import { DEFAULT_DOMAIN_REGION, DOMAIN_REGIONS } from "@/lib/domain-regions"
import { Globe, Plus, CheckCircle, XCircle, Clock, Loader2, Trash2 } from "lucide-react"

interface Domain {
  id: string
  name: string
  status: string
  spfVerified: boolean
  dkimVerified: boolean
  dmarcVerified: boolean
  organization: { name: string }
  createdAt: string
}

interface Organization {
  id: string
  name: string
}

const EMPTY_FORM = {
  name: "",
  organizationId: "",
  region: DEFAULT_DOMAIN_REGION as string,
}

export default function DomainsPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPERADMIN"

  const [domains, setDomains] = useState<Domain[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)

  // Ficha de registros DNS: se abre sola al dar de alta (reusando lo que
  // devolvió el alta) y a mano al pulsar una tarjeta (pidiéndolo a Resend).
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [recordsDetail, setRecordsDetail] = useState<DomainDetail | null>(null)
  const [recordsLoading, setRecordsLoading] = useState(false)

  // El dominio que se está por borrar. Nunca se borra al primer clic: la baja
  // también lo saca de Resend y eso invalida los registros DNS ya cargados.
  const [pendingDelete, setPendingDelete] = useState<Domain | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDomains = useCallback(async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/domains?organizationId=${activeOrg}` : "/api/domains"
    const res = await fetch(url)
    const data = await res.json()
    setDomains(data)
    setLoading(false)
  }, [isSuperAdmin])

  const fetchOrganizations = useCallback(async () => {
    const res = await fetch("/api/organizations")
    if (res.ok) {
      const data = await res.json()
      setOrganizations(data)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
    fetchOrganizations()
  }, [fetchDomains, fetchOrganizations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
      const payload = activeOrg && !formData.organizationId
        ? { ...formData, organizationId: activeOrg }
        : formData
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el dominio")

      setOpen(false)
      setFormData(EMPTY_FORM)
      fetchDomains()

      // El alta ya trae los registros DNS: los mostramos de inmediato, que es
      // lo único que el usuario necesita hacer a continuación.
      setRecordsDetail({ ...data, linkedToResend: true })
      setRecordsOpen(true)
      toast.success(
        data.adopted
          ? `${data.domain.name} ya existía en Resend: quedó vinculado con su estado real`
          : `${data.domain.name} dado de alta en Resend`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el dominio")
    } finally {
      setSaving(false)
    }
  }

  const openRecords = async (domainId: string) => {
    setRecordsDetail(null)
    setRecordsOpen(true)
    setRecordsLoading(true)
    try {
      const res = await fetch(`/api/domains/${domainId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el dominio")
      setRecordsDetail(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el dominio")
    } finally {
      setRecordsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/domains/${pendingDelete.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudo borrar el dominio")

      setPendingDelete(null)
      fetchDomains()
      toast.success(
        data.removedFromResend
          ? `${data.name} borrado acá y en Resend`
          : `${data.name} borrado. En Resend no estaba, así que revísalo en su dashboard.`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar el dominio")
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-success/10 text-success hover:bg-success/10 font-medium rounded-lg px-2.5 py-0.5 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Verificado</Badge>
      case "PENDING":
        return <Badge variant="outline" className="text-warning border-warning/30 font-medium rounded-lg px-2.5 py-0.5 text-xs"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>
      case "FAILED":
        return <Badge className="bg-danger/10 text-danger hover:bg-danger/10 font-medium rounded-lg px-2.5 py-0.5 text-xs"><XCircle className="w-3 h-3 mr-1" /> Fallido</Badge>
      default:
        return <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-foreground">Dominios</h1>
          <p className="text-foreground-muted mt-2 text-lg">Gestiona los dominios verificados para envío de emails</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          {/* Base UI usa `render`, no `asChild`: si no, queda un <button>
              dentro de otro y React tira error de hidratación. */}
          <DialogTrigger
            render={
              <Button className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2" />
            }
          >
            <Plus className="w-4 h-4" />
            Agregar dominio
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-border">
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">Nuevo dominio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-foreground-muted">Nombre del dominio</Label>
                <Input
                  id="name"
                  placeholder="ejemplo.com"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org" className="text-sm text-foreground-muted">Organización</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => setFormData({ ...formData, organizationId: value as string })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border">
                    <SelectValue placeholder="Selecciona una organización" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region" className="text-sm text-foreground-muted">Región de envío</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value as string })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DOMAIN_REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-foreground-subtle">
                  No se puede cambiar después. Para clientes en Chile, São Paulo.
                </p>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Dando de alta en Resend…" : "Guardar dominio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {domains.map((domain) => (
          <Card key={domain.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong transition-all">
            <CardContent className="p-0 flex items-stretch">
              {/* La tarjeta abre la ficha de registros DNS; el botón de borrar
                  va aparte para no anidar un <button> dentro de otro. */}
              <button
                type="button"
                onClick={() => openRecords(domain.id)}
                className="flex-1 min-w-0 text-left p-5 rounded-l-2xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-background-muted rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-foreground text-lg">{domain.name}</h3>
                        {getStatusBadge(domain.status)}
                      </div>
                      <p className="text-sm text-foreground-subtle">{domain.organization?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-lg ${domain.spfVerified ? "bg-success/10 text-success" : "bg-background-muted text-foreground-subtle/60"}`}>SPF</span>
                      <span className={`px-2 py-1 rounded-lg ${domain.dkimVerified ? "bg-success/10 text-success" : "bg-background-muted text-foreground-subtle/60"}`}>DKIM</span>
                      <span className={`px-2 py-1 rounded-lg ${domain.dmarcVerified ? "bg-success/10 text-success" : "bg-background-muted text-foreground-subtle/60"}`}>DMARC</span>
                    </div>
                    <span className="text-xs text-foreground-subtle/60">Ver DNS</span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(domain)}
                aria-label={`Borrar ${domain.name}`}
                className="px-5 rounded-r-2xl text-foreground-subtle/60 hover:text-danger hover:bg-danger/5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        ))}

        {domains.length === 0 && !loading && (
          <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-foreground-subtle/60" />
              </div>
              <p className="text-foreground-subtle font-medium">No hay dominios registrados</p>
              <p className="text-sm text-foreground-subtle/60 mt-1">Agrega un dominio para empezar a enviar campañas</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deleting) setPendingDelete(null)
        }}
      >
        <DialogContent className="rounded-2xl border-border">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              ¿Borrar {pendingDelete?.name}?
            </DialogTitle>
            <DialogDescription>
              Se da de baja también en Resend, así que los registros DNS que ya cargaste dejan de
              servir: si más adelante vuelves a agregar el dominio, Resend genera otro DKIM y hay
              que editar la zona de nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
              className="h-11 rounded-xl text-sm font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="h-11 bg-danger hover:bg-danger/90 text-white rounded-xl text-sm font-medium gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? "Borrando…" : "Borrar dominio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DomainRecordsDialog
        open={recordsOpen}
        onOpenChange={(isOpen) => {
          setRecordsOpen(isOpen)
          if (!isOpen) setRecordsDetail(null)
        }}
        detail={recordsDetail}
        loading={recordsLoading}
        onDetailChange={setRecordsDetail}
        onSynced={fetchDomains}
      />
    </div>
  )
}
