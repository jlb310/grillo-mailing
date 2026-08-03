"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Send, Save, Clock } from "lucide-react"
import Link from "next/link"

interface Template {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string | null
}

interface Domain {
  id: string
  name: string
  status: string
}

interface ContactList {
  id: string
  name: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPERADMIN"

  const [templates, setTemplates] = useState<Template[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
    domainId: "",
    contactListId: "",
    templateId: "",
    scheduledAt: "",
  })

  const fetchTemplates = useCallback(async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/templates?organizationId=${activeOrg}` : "/api/templates"
    const res = await fetch(url)
    const data = await res.json()
    setTemplates(data)
  }, [isSuperAdmin])

  const fetchDomains = useCallback(async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/domains?organizationId=${activeOrg}` : "/api/domains"
    const res = await fetch(url)
    const data = await res.json()
    setDomains(data.filter((d: Domain) => d.status === "VERIFIED"))
  }, [isSuperAdmin])

  const fetchLists = useCallback(async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/contact-lists?organizationId=${activeOrg}` : "/api/contact-lists"
    const res = await fetch(url)
    const data = await res.json()
    setLists(data)
  }, [isSuperAdmin])

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchDomains(), fetchLists()]).then(() => setLoading(false))
  }, [fetchTemplates, fetchDomains, fetchLists])

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        templateId,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || "",
      })
    }
  }

  const handleSubmit = async (action: "draft" | "send" | "schedule") => {
    if (action === "draft") setSaving(true)
    if (action === "send") setSending(true)
    if (action === "schedule") setScheduling(true)

    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const payload = {
      ...formData,
      status: action === "schedule" ? "SCHEDULED" : "DRAFT",
      scheduledAt: action === "schedule" && formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
      ...(activeOrg ? { organizationId: activeOrg } : {}),
    }

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setSaving(false)
      setSending(false)
      setScheduling(false)
      return
    }

    const campaign = await res.json()

    if (action === "send") {
      const sendRes = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      })
      setSending(false)
      if (sendRes.ok) {
        router.push("/dashboard/campaigns")
      }
    } else {
      setSaving(false)
      setScheduling(false)
      router.push("/dashboard/campaigns")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="sm" className="rounded-xl h-9 text-foreground-muted hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl text-foreground">Nueva campaña</h1>
            <p className="text-foreground-subtle mt-1">Configura y envía tu campaña de email</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSubmit("draft")} 
            disabled={saving || sending || scheduling}
            className="h-11 rounded-xl border-border text-foreground hover:bg-background-muted"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button 
            onClick={() => handleSubmit("schedule")} 
            disabled={scheduling || !formData.domainId || !formData.contactListId || !formData.scheduledAt}
            className="h-11 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 rounded-xl text-sm font-medium gap-2"
          >
            <Clock className="w-4 h-4" />
            {scheduling ? "Programando..." : "Programar"}
          </Button>
          <Button 
            onClick={() => handleSubmit("send")} 
            disabled={sending || !formData.domainId || !formData.contactListId}
            className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Configuración general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-foreground-muted">Nombre de la campaña</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Newsletter Julio 2026"
                className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground-muted">Template base</Label>
              <Select onValueChange={(value) => handleTemplateChange(value as string)}>
                <SelectTrigger className="h-11 rounded-xl border-border">
                  <SelectValue placeholder="Selecciona un template (opcional)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Remitente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName" className="text-sm text-foreground-muted">Nombre del remitente</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  placeholder="Grillo"
                  className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail" className="text-sm text-foreground-muted">Email del remitente</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  placeholder="hola@tu-dominio.com"
                  className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyTo" className="text-sm text-foreground-muted">Reply-to (opcional)</Label>
              <Input
                id="replyTo"
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
                placeholder="soporte@tu-dominio.com"
                className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground-muted">Dominio de envío</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, domainId: value as string })}>
                <SelectTrigger className="h-11 rounded-xl border-border">
                  <SelectValue placeholder="Selecciona un dominio verificado" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {domains.length === 0 && (
                <p className="text-sm text-warning">No tienes dominios verificados. <Link href="/dashboard/domains" className="underline">Verifica uno primero</Link>.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Destinatarios y programación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-foreground-muted">Lista de contactos</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, contactListId: value as string })}>
                <SelectTrigger className="h-11 rounded-xl border-border">
                  <SelectValue placeholder="Selecciona una lista" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt" className="text-sm text-foreground-muted">Programar envío (opcional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
              />
              <p className="text-xs text-foreground-subtle">
                Si no seleccionas fecha, puedes enviar manualmente con &quot;Enviar ahora&quot; o guardar como borrador.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Contenido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm text-foreground-muted">Asunto</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Asunto del email"
                className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="html" className="text-sm text-foreground-muted">Contenido HTML</Label>
              <Textarea
                id="html"
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                rows={12}
                className="font-mono text-sm rounded-xl border-border focus:border-primary focus:ring-primary/20 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text" className="text-sm text-foreground-muted">Contenido texto plano (opcional)</Label>
              <Textarea
                id="text"
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                rows={4}
                className="font-mono text-sm rounded-xl border-border focus:border-primary focus:ring-primary/20 resize-none"
                placeholder="Versión en texto plano..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
