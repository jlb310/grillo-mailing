"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Send, Clock, CheckCircle, XCircle, Loader2, Mail, MousePointer, Eye, TrendingUp } from "lucide-react"
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT": return <Badge className="bg-[#dcfce7] text-[#16a34a] hover:bg-[#dcfce7] font-medium rounded-lg px-2.5 py-0.5"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Enviada</Badge>
      case "DRAFT": return <Badge variant="outline" className="text-[#a3a3a3] border-[#e5e5e5] font-medium rounded-lg px-2.5 py-0.5"><Clock className="w-3.5 h-3.5 mr-1" /> Borrador</Badge>
      case "SENDING": return <Badge className="bg-[#fef3c7] text-[#d97706] hover:bg-[#fef3c7] font-medium rounded-lg px-2.5 py-0.5"><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Enviando</Badge>
      case "FAILED": return <Badge className="bg-[#fee2e2] text-[#dc2626] hover:bg-[#fee2e2] font-medium rounded-lg px-2.5 py-0.5"><XCircle className="w-3.5 h-3.5 mr-1" /> Fallida</Badge>
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
      <div className="w-8 h-8 border-2 border-[#e5e5e5] border-t-[#1a1a1a] rounded-full animate-spin" />
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
            <Button variant="ghost" size="sm" className="rounded-xl h-9 text-[#737373] hover:text-[#1a1a1a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-[#a3a3a3] mt-1">{campaign.subject}</p>
          </div>
        </div>
        {campaign.status === "DRAFT" && (
          <Button 
            onClick={handleSend} 
            disabled={sending}
            className="h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : "Enviar campaña"}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { name: "Enviados", value: stats.delivered, icon: Mail, color: "text-[#1a1a1a]" },
          { name: "Abiertos", value: stats.opened, rate: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0, icon: Eye, color: "text-[#525252]" },
          { name: "Clicks", value: stats.clicked, rate: stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0, icon: MousePointer, color: "text-[#737373]" },
          { name: "Destinatarios", value: stats.total, icon: TrendingUp, color: "text-[#a3a3a3]" },
        ].map((stat) => (
          <Card key={stat.name} className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-sm text-[#a3a3a3]">{stat.name}</span>
              </div>
              <div className="text-2xl font-semibold text-[#1a1a1a] tracking-tight">{stat.value}</div>
              {'rate' in stat && (
                <p className="text-xs text-[#a3a3a3] mt-1">{stat.rate}% tasa</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Details */}
        <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-[#1a1a1a]">
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
              <div key={item.label} className="flex justify-between items-start py-2 border-b border-[#f5f5f5] last:border-0">
                <span className="text-[#a3a3a3]">{item.label}</span>
                <span className="text-[#1a1a1a] font-medium text-right max-w-[60%]">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-[#1a1a1a]">
              Vista previa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border border-[#e5e5e5] rounded-xl overflow-hidden m-4">
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
