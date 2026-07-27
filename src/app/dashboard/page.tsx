import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Globe, Send, Users, TrendingUp, ArrowRight, Plus } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/login")
  }

  const isAdmin = session.user.role === "ADMIN"
  const orgId = session.user.organizationId

  const [organizationsCount, domainsCount, campaignsCount, contactsCount] = await Promise.all([
    isAdmin ? prisma.organization.count() : Promise.resolve(0),
    isAdmin ? prisma.domain.count() : prisma.domain.count({ where: { organizationId: orgId! } }),
    isAdmin ? prisma.campaign.count() : prisma.campaign.count({ where: { organizationId: orgId! } }),
    isAdmin ? prisma.contact.count() : prisma.contact.count({ where: { organizationId: orgId! } }),
  ])

  const stats = [
    {
      name: isAdmin ? "Organizaciones" : "Dominios",
      value: isAdmin ? organizationsCount : domainsCount,
      icon: isAdmin ? Building2 : Globe,
      description: isAdmin ? "Clientes activos" : "Dominios verificados",
      href: isAdmin ? "/dashboard/organizations" : "/dashboard/domains",
    },
    {
      name: "Campañas",
      value: campaignsCount,
      icon: Send,
      description: "Total enviadas",
      href: "/dashboard/campaigns",
    },
    {
      name: "Contactos",
      value: contactsCount,
      icon: Users,
      description: "En base de datos",
      href: "/dashboard/contacts",
    },
  ]

  if (!isAdmin) {
    stats.unshift({
      name: "Dominios",
      value: domainsCount,
      icon: Globe,
      description: "Dominios verificados",
      href: "/dashboard/domains",
    })
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">
            Dashboard
          </h1>
          <p className="text-[#737373] mt-2 text-lg">
            Bienvenido de vuelta, {session.user.name || session.user.email}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2">
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none hover:shadow-md hover:border-[#d4d4d4] transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#f5f5f5] rounded-xl flex items-center justify-center group-hover:bg-[#1a1a1a] transition-colors">
                    <stat.icon className="w-5 h-5 text-[#525252] group-hover:text-white transition-colors" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#d4d4d4] group-hover:text-[#1a1a1a] transition-colors" />
                </div>
                <div className="text-3xl font-semibold text-[#1a1a1a] tracking-tight">{stat.value}</div>
                <p className="text-sm text-[#a3a3a3] mt-1">{stat.name}</p>
                <p className="text-xs text-[#d4d4d4] mt-0.5">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-[#1a1a1a]">
              Empezar rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: "01", title: "Verifica un dominio", desc: "Conecta tu dominio con Resend para poder enviar emails.", href: "/dashboard/domains", done: domainsCount > 0 },
              { step: "02", title: "Importa tus contactos", desc: "Sube un CSV con tus contactos o agrégalos manualmente.", href: "/dashboard/contacts", done: contactsCount > 0 },
              { step: "03", title: "Crea tu primera campaña", desc: "Diseña un email, elige una lista y envía.", href: "/dashboard/campaigns/new", done: campaignsCount > 0 },
            ].map((item) => (
              <Link key={item.step} href={item.href}>
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-[#fafafa] transition-colors group cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold ${
                    item.done ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f5f5f5] text-[#a3a3a3] group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors"
                  }`}>
                    {item.done ? "✓" : item.step}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#1a1a1a] text-sm">{item.title}</p>
                    <p className="text-sm text-[#a3a3a3] mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#d4d4d4] group-hover:text-[#1a1a1a] transition-colors mt-2" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-[#1a1a1a]">
              Actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
              <p className="text-sm text-[#a3a3a3]">No hay actividad reciente</p>
              <p className="text-xs text-[#d4d4d4] mt-1">Las métricas aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
