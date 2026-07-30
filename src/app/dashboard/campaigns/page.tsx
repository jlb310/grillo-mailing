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
        return <Badge className="bg-success/10 text-success hover:bg-success/10 font-medium rounded-lg px-2.5 py-0.5 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Enviada</Badge>
      case "DRAFT":
        return <Badge variant="outline" className="text-foreground-subtle border-border font-medium rounded-lg px-2.5 py-0.5 text-xs"><Clock className="w-3 h-3 mr-1" /> Borrador</Badge>
      case "SCHEDULED":
        return <Badge variant="outline" className="text-primary border-primary/30 font-medium rounded-lg px-2.5 py-0.5 text-xs"><Clock className="w-3 h-3 mr-1" /> Programada</Badge>
      case "SENDING":
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/10 font-medium rounded-lg px-2.5 py-0.5 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando</Badge>
      case "FAILED":
        return <Badge className="bg-danger/10 text-danger hover:bg-danger/10 font-medium rounded-lg px-2.5 py-0.5 text-xs"><XCircle className="w-3 h-3 mr-1" /> Fallida</Badge>
      default:
        return <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 text-xs">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Campañas</h1>
          <p className="text-foreground-muted mt-2 text-lg">Gestiona tus campañas de email</p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2">
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Button>
        </Link>
      </div>

      {/* Campaigns list */}
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong hover:shadow-sm transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 bg-background-muted rounded-xl flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-foreground-muted" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground text-sm truncate">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-foreground-subtle mt-0.5 truncate">{campaign.subject}</p>
                    <div className="flex gap-3 mt-1 text-xs text-foreground-subtle/60">
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
                  <Button variant="ghost" size="sm" className="rounded-xl text-foreground-muted hover:text-foreground hover:bg-background-muted shrink-0">
                    Ver detalle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {campaigns.length === 0 && !loading && (
          <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-foreground-subtle/60" />
              </div>
              <p className="text-foreground-subtle font-medium">No hay campañas creadas</p>
              <p className="text-sm text-foreground-subtle/60 mt-1">Crea tu primera campaña para empezar</p>
              <Link href="/dashboard/campaigns/new">
                <Button className="mt-4 h-10 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm">
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
