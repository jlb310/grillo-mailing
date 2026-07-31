import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Users, Globe, Send } from "lucide-react"
import Link from "next/link"
import { ResendCredentialsDialog } from "@/components/organizations/resend-credentials-dialog"

export default async function OrganizationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // `select` explícito para no arrastrar las credenciales cifradas del cliente
  // hasta acá: de esta página solo salen booleanos hacia el componente cliente.
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      resendApiKey: true,
      resendWebhookSecret: true,
      _count: {
        select: {
          users: true,
          domains: true,
          campaigns: true,
        }
      }
    }
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Organizaciones</h1>
          <p className="text-foreground-muted mt-2 text-lg">Gestiona los clientes de la plataforma</p>
        </div>
        <Link href="/dashboard/organizations/new">
          <Button className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2">
            <Plus className="w-4 h-4" />
            Nueva organización
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {organizations.map((org) => (
          <Card key={org.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong hover:shadow-sm transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-background-muted rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-foreground-muted" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{org.name}</h3>
                    <p className="text-sm text-foreground-subtle">{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex gap-4 text-sm text-foreground-subtle">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{org._count.users}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{org._count.domains}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" />
                      <span>{org._count.campaigns}</span>
                    </div>
                  </div>
                  <ResendCredentialsDialog
                    organizationId={org.id}
                    organizationName={org.name}
                    hasApiKey={Boolean(org.resendApiKey)}
                    hasWebhookSecret={Boolean(org.resendWebhookSecret)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {organizations.length === 0 && (
          <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-foreground-subtle/60" />
              </div>
              <p className="text-foreground-subtle font-medium">No hay organizaciones registradas</p>
              <p className="text-sm text-foreground-subtle/60 mt-1">Crea la primera para empezar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
