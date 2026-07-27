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
        return <Badge className="bg-[#dcfce7] text-[#16a34a] hover:bg-[#dcfce7] font-medium rounded-lg px-2.5 py-0.5 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Verificado</Badge>
      case "PENDING":
        return <Badge variant="outline" className="text-[#d97706] border-[#fde68a] font-medium rounded-lg px-2.5 py-0.5 text-xs"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>
      case "FAILED":
        return <Badge className="bg-[#fee2e2] text-[#dc2626] hover:bg-[#fee2e2] font-medium rounded-lg px-2.5 py-0.5 text-xs"><XCircle className="w-3 h-3 mr-1" /> Fallido</Badge>
      default:
        return <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">Dominios</h1>
          <p className="text-[#737373] mt-2 text-lg">Gestiona los dominios verificados para envío de emails</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button className="h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2">
              <Plus className="w-4 h-4" />
              Agregar dominio
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-[#e5e5e5]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight text-[#1a1a1a]">Nuevo dominio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-[#525252]">Nombre del dominio</Label>
                <Input
                  id="name"
                  placeholder="ejemplo.com"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-11 rounded-xl border-[#e5e5e5] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org" className="text-sm text-[#525252]">Organización</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => setFormData({ ...formData, organizationId: value as string })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-[#e5e5e5]">
                    <SelectValue placeholder="Selecciona una organización" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium">
                Guardar dominio
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {domains.map((domain) => (
          <Card key={domain.id} className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none hover:border-[#d4d4d4] transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#f5f5f5] rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#525252]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-[#1a1a1a] text-sm">{domain.name}</h3>
                      {getStatusBadge(domain.status)}
                    </div>
                    <p className="text-sm text-[#a3a3a3]">{domain.organization?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-lg ${domain.spfVerified ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f5f5f5] text-[#d4d4d4]"}`}>SPF</span>
                    <span className={`px-2 py-1 rounded-lg ${domain.dkimVerified ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f5f5f5] text-[#d4d4d4]"}`}>DKIM</span>
                    <span className={`px-2 py-1 rounded-lg ${domain.dmarcVerified ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f5f5f5] text-[#d4d4d4]"}`}>DMARC</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {domains.length === 0 && !loading && (
          <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-[#d4d4d4]" />
              </div>
              <p className="text-[#a3a3a3] font-medium">No hay dominios registrados</p>
              <p className="text-sm text-[#d4d4d4] mt-1">Agrega un dominio para empezar a enviar campañas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
