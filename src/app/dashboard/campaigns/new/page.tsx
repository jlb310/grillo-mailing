"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { EmailBuilder, type EmailBlock } from "@/components/email-builder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Send, Save, Clock, Mail } from "lucide-react"
import Link from "next/link"

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

  const [domains, setDomains] = useState<Domain[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

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
    Promise.all([fetchDomains(), fetchLists()]).then(() => setLoading(false))
  }, [fetchDomains, fetchLists])

  const handleBuilderChange = (_blocks: EmailBlock[], html: string, text: string) => {
    setFormData((current) => ({ ...current, htmlContent: html, textContent: text }))
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

  const handleTestSend = async () => {
    if (!testEmail || !formData.subject || !formData.htmlContent || !formData.fromEmail || !formData.domainId) {
      setTestResult({ type: "error", message: "Completa asunto, contenido HTML, remitente, dominio y email de prueba" })
      return
    }

    setTesting(true)
    setTestResult(null)

    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const payload = {
      name: formData.name || "Prueba",
      subject: formData.subject,
      htmlContent: formData.htmlContent,
      textContent: formData.textContent,
      fromName: formData.fromName,
      fromEmail: formData.fromEmail,
      replyTo: formData.replyTo,
      domainId: formData.domainId,
      organizationId: activeOrg,
      testEmail,
    }

    try {
      const res = await fetch("/api/campaigns/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        setTestResult({ type: "success", message: data.message || `Prueba enviada a ${testEmail}` })
      } else {
        setTestResult({ type: "error", message: data.error || "Error al enviar prueba" })
      }
    } catch {
      setTestResult({ type: "error", message: "No se pudo conectar con el servidor" })
    } finally {
      setTesting(false)
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

      {/* Test email section */}
      <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-foreground-subtle mb-1.5 block">Email de prueba</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="hola@ejemplo.cl"
                className="h-10 rounded-xl border-border text-sm"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTestSend}
              disabled={testing || !testEmail || !formData.subject || !formData.htmlContent || !formData.domainId}
              className="h-10 rounded-xl border-border text-foreground hover:bg-background-muted mt-5"
            >
              <Mail className="w-4 h-4 mr-2" />
              {testing ? "Enviando prueba..." : "Enviar prueba"}
            </Button>
          </div>
          {testResult && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
              testResult.type === "success" 
                ? "bg-success/10 text-success" 
                : "bg-danger/10 text-danger"
            }`}>
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

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
              <Label htmlFor="subject" className="text-sm text-foreground-muted">Asunto del email</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ej: Novedades de este mes"
                className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
              />
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

        <Card className="border border-border bg-background-elev rounded-2xl shadow-none overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Diseña tu mailing</CardTitle>
            <p className="text-sm text-foreground-subtle">Elige una plantilla o agrega bloques para construir el contenido.</p>
          </CardHeader>
          <CardContent className="p-0">
            <EmailBuilder onChange={handleBuilderChange} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
