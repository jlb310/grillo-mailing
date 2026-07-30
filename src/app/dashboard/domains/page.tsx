"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
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
import { Globe, Plus, CheckCircle, XCircle, Clock } from "lucide-react"

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

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", organizationId: "" })

  useEffect(() => {
    fetchDomains()
    fetchOrganizations()
  }, [])

  const fetchDomains = async () => {
    const res = await fetch("/api/domains")
    const data = await res.json()
    setDomains(data)
    setLoading(false)
  }

  const fetchOrganizations = async () => {
    const res = await fetch("/api/organizations")
    if (res.ok) {
      const data = await res.json()
      setOrganizations(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
    if (res.ok) {
      setOpen(false)
      setFormData({ name: "", organizationId: "" })
      fetchDomains()
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
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Dominios</h1>
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
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">Nuevo dominio</DialogTitle>
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
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium">
                Guardar dominio
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {domains.map((domain) => (
          <Card key={domain.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-background-muted rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-foreground-muted" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground text-sm">{domain.name}</h3>
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
                </div>
              </div>
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
    </div>
  )
}
