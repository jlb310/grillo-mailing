import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions, getEffectiveOrganizationId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Globe, Send, Users, TrendingUp, ArrowRight, Plus } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage({ searchParams }: { searchParams?: { org?: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/login")
  }

  const effectiveOrgId = getEffectiveOrganizationId(session, searchParams?.org)
  const isAdmin = session.user.role === "SUPERADMIN"
  const isGlobalView = isAdmin && !effectiveOrgId

  const orgFilter = effectiveOrgId ? { organizationId: effectiveOrgId } : undefined

  const [organizationsCount, domainsCount, campaignsCount, contactsCount] = await Promise.all([
    isGlobalView ? prisma.organization.count() : Promise.resolve(0),
    orgFilter ? prisma.domain.count({ where: orgFilter }) : prisma.domain.count(),
    orgFilter ? prisma.campaign.count({ where: orgFilter }) : prisma.campaign.count(),
    orgFilter ? prisma.contact.count({ where: orgFilter }) : prisma.contact.count(),
  ])

  const stats = [
    {
      name: isGlobalView ? "Organizaciones" : "Dominios",
      value: isGlobalView ? organizationsCount : domainsCount,
      icon: isGlobalView ? Building2 : Globe,
      description: isGlobalView ? "Clientes activos" : "Dominios verificados",
      href: isGlobalView ? "/dashboard/organizations" : "/dashboard/domains",
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

  if (!isGlobalView) {
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
          <h1 className="text-4xl text-foreground">
            Dashboard
          </h1>
          <p className="text-foreground-muted mt-2 text-lg">
            Bienvenido de vuelta, {session.user.name || session.user.email}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2">
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="border border-border bg-background-elev rounded-2xl shadow-none hover:shadow-md hover:border-border-strong transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-background-muted rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors">
                    <stat.icon className="w-5 h-5 text-foreground-muted group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground-subtle/60 group-hover:text-foreground transition-colors" />
                </div>
                <div className="text-3xl font-semibold text-foreground tracking-tight">{stat.value}</div>
                <p className="text-sm text-foreground-subtle mt-1">{stat.name}</p>
                <p className="text-xs text-foreground-subtle/60 mt-0.5">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-border bg-background-elev rounded-2xl shadow-none lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
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
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-background-sunken transition-colors group cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold ${
                    item.done ? "bg-success/10 text-success" : "bg-background-muted text-foreground-subtle group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  }`}>
                    {item.done ? "✓" : item.step}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    <p className="text-sm text-foreground-subtle mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground-subtle/60 group-hover:text-foreground transition-colors mt-2" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
              Actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-border mx-auto mb-3" />
              <p className="text-sm text-foreground-subtle">No hay actividad reciente</p>
              <p className="text-xs text-foreground-subtle/60 mt-1">Las métricas aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
