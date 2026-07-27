"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Plus, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  sentAt: string | null
  scheduledAt: string | null
  fromName: string
  fromEmail: string
  domain: { name: string }
  contactList: { name: string } | null
  template: { name: string } | null
  createdAt: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    const res = await fetch("/api/campaigns")
    const data = await res.json()
    setCampaigns(data)
    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return <Badge className="bg-[#dcfce7] text-[#16a34a] hover:bg-[#dcfce7] font-medium rounded-lg px-2.5 py-0.5 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Enviada</Badge>
      case "DRAFT":
        return <Badge variant="outline" className="text-[#a3a3a3] border-[#e5e5e5] font-medium rounded-lg px-2.5 py-0.5 text-xs"><Clock className="w-3 h-3 mr-1" /> Borrador</Badge>
      case "SCHEDULED":
        return <Badge variant="outline" className="text-[#2563eb] border-[#bfdbfe] font-medium rounded-lg px-2.5 py-0.5 text-xs"><Clock className="w-3 h-3 mr-1" /> Programada</Badge>
      case "SENDING":
        return <Badge className="bg-[#fef3c7] text-[#d97706] hover:bg-[#fef3c7] font-medium rounded-lg px-2.5 py-0.5 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando</Badge>
      case "FAILED":
        return <Badge className="bg-[#fee2e2] text-[#dc2626] hover:bg-[#fee2e2] font-medium rounded-lg px-2.5 py-0.5 text-xs"><XCircle className="w-3 h-3 mr-1" /> Fallida</Badge>
      default:
        return <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">Campañas</h1>
          <p className="text-[#737373] mt-2 text-lg">Gestiona tus campañas de email</p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2">
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Button>
        </Link>
      </div>

      {/* Campaigns list */}
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none hover:border-[#d4d4d4] hover:shadow-sm transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 bg-[#f5f5f5] rounded-xl flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-[#525252]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-[#1a1a1a] text-sm truncate">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-[#a3a3a3] mt-0.5 truncate">{campaign.subject}</p>
                    <div className="flex gap-3 mt-1 text-xs text-[#d4d4d4]">
                      <span>De: {campaign.fromName} &lt;{campaign.fromEmail}&gt;</span>
                      <span>·</span>
                      <span>{campaign.domain?.name}</span>
                      {campaign.contactList && (
                        <>
                          <span>·</span>
                          <span>Lista: {campaign.contactList.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                  <Button variant="ghost" size="sm" className="rounded-xl text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] shrink-0">
                    Ver detalle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {campaigns.length === 0 && !loading && (
          <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-[#d4d4d4]" />
              </div>
              <p className="text-[#a3a3a3] font-medium">No hay campañas creadas</p>
              <p className="text-sm text-[#d4d4d4] mt-1">Crea tu primera campaña para empezar</p>
              <Link href="/dashboard/campaigns/new">
                <Button className="mt-4 h-10 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva campaña
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
