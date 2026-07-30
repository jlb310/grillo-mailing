"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart3, Mail, Eye, MousePointer, TrendingUp } from "lucide-react"

interface AnalyticsData {
  campaigns: {
    id: string
    name: string
    subject: string
    status: string
    sentAt: string | null
    _count: { events: number }
  }[]
  events: {
    type: string
    count: number
  }[]
  dailyStats: {
    date: string
    sent: number
    opened: number
    clicked: number
  }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    const res = await fetch("/api/analytics")
    const analyticsData = await res.json()
    setData(analyticsData)
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
  if (!data) return null

  const totalSent = data.events.find((e) => e.type === "DELIVERED")?.count || 0
  const totalOpened = data.events.find((e) => e.type === "OPENED")?.count || 0
  const totalClicked = data.events.find((e) => e.type === "CLICKED")?.count || 0

  const stats = [
    { name: "Total enviados", value: totalSent, icon: Mail, color: "#1a1a1a" },
    { name: "Total abiertos", value: totalOpened, rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0, icon: Eye, color: "#525252" },
    { name: "Total clicks", value: totalClicked, rate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0, icon: MousePointer, color: "#737373" },
    { name: "Campañas", value: data.campaigns.length, icon: TrendingUp, color: "#a3a3a3" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="text-foreground-muted mt-2 text-lg">Métricas y rendimiento de tus campañas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
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

      <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Actividad diaria (últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.dailyStats} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#d4d4d4" 
                fontSize={11} 
                tickFormatter={(value) => new Date(value).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#d4d4d4" 
                fontSize={11} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#1a1a1a", 
                  border: "none", 
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px"
                }}
                cursor={{ fill: "#f5f5f5", opacity: 0.5 }}
              />
              <Bar dataKey="sent" fill="#1a1a1a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="opened" fill="#525252" radius={[6, 6, 0, 0]} />
              <Bar dataKey="clicked" fill="#a3a3a3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Campañas recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.campaigns.slice(0, 10).map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-background-sunken rounded-xl hover:bg-background-muted transition-colors">
                <div>
                  <p className="font-medium text-sm text-foreground">{campaign.name}</p>
                  <p className="text-xs text-foreground-subtle">{campaign.subject}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{campaign._count.events} eventos</p>
                  <p className="text-xs text-foreground-subtle/60">
                    {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString("es-CL") : "No enviada"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
