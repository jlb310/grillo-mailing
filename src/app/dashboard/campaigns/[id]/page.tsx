"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Send, Clock, CheckCircle, XCircle, Loader2, Mail, MousePointer, Eye, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  htmlContent: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  sentAt: string | null
  scheduledAt: string | null
  domain: { name: string }
  contactList: { name: string; _count?: { members: number } } | null
  template: { name: string } | null
  createdBy: { name: string | null; email: string }
  createdAt: string
  events: { type: string; email: string; timestamp: string }[]
}

export default function CampaignDetailPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [id, setId] = useState<string>("")

  useEffect(() => {
    const pathParts = window.location.pathname.split("/")
    const campaignId = pathParts[pathParts.length - 1]
    setId(campaignId)
    if (campaignId) fetchCampaign(campaignId)
  }, [])

  const fetchCampaign = async (campaignId: string) => {
    const res = await fetch(`/api/campaigns/${campaignId}`)
    if (!res.ok) {
      window.location.href = "/dashboard/campaigns"
      return
    }
    const data = await res.json()
    setCampaign(data)
    setLoading(false)
  }

  const handleSend = async () => {
    if (!id) return
    setSending(true)
    const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" })
    setSending(false)
    if (res.ok) {
      fetchCampaign(id)
    }
  }

  const handleTestSend = async () => {
    if (!campaign || !testEmail) return

    setTesting(true)
    setTestResult(null)

    const payload = {
      name: campaign.name,
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      textContent: "",
      fromName: campaign.fromName,
      fromEmail: campaign.fromEmail,
      replyTo: campaign.replyTo || "",
      testEmail,
    }

    const res = await fetch("/api/campaigns/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    setTesting(false)

    if (res.ok) {
      setTestResult({ type: "success", message: data.message || `Prueba enviada a ${testEmail}` })
    } else {
      setTestResult({ type: "error", message: data.error || "Error al enviar prueba" })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT": return <Badge className="bg-success/10 text-success hover:bg-success/10 font-medium rounded-lg px-2.5 py-0.5"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Enviada</Badge>
      case "DRAFT": return <Badge variant="outline" className="text-foreground-subtle border-border font-medium rounded-lg px-2.5 py-0.5"><Clock className="w-3.5 h-3.5 mr-1" /> Borrador</Badge>
      case "SENDING": return <Badge className="bg-warning/10 text-warning hover:bg-warning/10 font-medium rounded-lg px-2.5 py-0.5"><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Enviando</Badge>
      case "FAILED": return <Badge className="bg-danger/10 text-danger hover:bg-danger/10 font-medium rounded-lg px-2.5 py-0.5"><XCircle className="w-3.5 h-3.5 mr-1" /> Fallida</Badge>
      default: return <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5">{status}</Badge>
    }
  }

  const getStats = () => {
    if (!campaign) return { delivered: 0, opened: 0, clicked: 0, total: 0 }
    const delivered = campaign.events.filter((e) => e.type === "DELIVERED").length
    const opened = campaign.events.filter((e) => e.type === "OPENED").length
    const clicked = campaign.events.filter((e) => e.type === "CLICKED").length
    const total = campaign.contactList?._count?.members || campaign.events.length || 0
    return { delivered, opened, clicked, total }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
  if (!campaign) return null

  const stats = getStats()

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="sm" className="rounded-xl h-9 text-foreground-muted hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-foreground">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-foreground-subtle mt-1">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {campaign.status === "DRAFT" && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email de prueba"
                  className="h-10 w-56 rounded-xl border-border text-sm"
                />
                <Button
                  variant="outline"
                  onClick={handleTestSend}
                  disabled={testing || !testEmail}
                  className="h-10 rounded-xl border-border text-foreground hover:bg-background-muted"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {testing ? "Enviando..." : "Enviar prueba"}
                </Button>
              </div>
              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar campaña"}
              </Button>
            </>
          )}
        </div>
      </div>
      {testResult && (
        <div className={`text-sm px-4 py-2.5 rounded-lg ${
          testResult.type === "success" 
            ? "bg-success/10 text-success" 
            : "bg-danger/10 text-danger"
        }`}>
          {testResult.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { name: "Enviados", value: stats.delivered, icon: Mail, color: "text-foreground" },
          { name: "Abiertos", value: stats.opened, rate: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0, icon: Eye, color: "text-foreground-muted" },
          { name: "Clicks", value: stats.clicked, rate: stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0, icon: MousePointer, color: "text-foreground-muted" },
          { name: "Destinatarios", value: stats.total, icon: TrendingUp, color: "text-foreground-subtle" },
        ].map((stat) => (
          <Card key={stat.name} className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-sm text-foreground-subtle">{stat.name}</span>
              </div>
              <div className="text-2xl font-semibold text-foreground tracking-tight">{stat.value}</div>
              {'rate' in stat && (
                <p className="text-xs text-foreground-subtle mt-1">{stat.rate}% tasa</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Details */}
        <Card className="border border-border bg-background-elev rounded-2xl shadow-none lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
              Detalles del envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              { label: "Remitente", value: `${campaign.fromName} <${campaign.fromEmail}>` },
              { label: "Dominio", value: campaign.domain.name },
              { label: "Lista", value: campaign.contactList?.name || "N/A" },
              { label: "Template", value: campaign.template?.name || "N/A" },
              { label: "Creado por", value: campaign.createdBy.name || campaign.createdBy.email },
              { label: "Creado", value: new Date(campaign.createdAt).toLocaleString("es-CL") },
              ...(campaign.sentAt ? [{ label: "Enviado", value: new Date(campaign.sentAt).toLocaleString("es-CL") }] : []),
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                <span className="text-foreground-subtle">{item.label}</span>
                <span className="text-foreground font-medium text-right max-w-[60%]">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border border-border bg-background-elev rounded-2xl shadow-none lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
              Vista previa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border border-border rounded-xl overflow-hidden m-4">
              <iframe
                srcDoc={campaign.htmlContent}
                className="w-full h-[500px] border-0"
                title="Campaign Preview"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
