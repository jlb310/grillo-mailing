"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Eye } from "lucide-react"
import Link from "next/link"

interface Template {
  id: string
  name: string
  subject: string
  htmlContent: string
  createdAt: string
  organization: { name: string }
  createdBy: { name: string | null; email: string }
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPERADMIN"

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  const fetchTemplates = async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/templates?organizationId=${activeOrg}` : "/api/templates"
    const res = await fetch(url)
    const data = await res.json()
    setTemplates(data)
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-foreground">Templates</h1>
          <p className="text-foreground-muted mt-2 text-lg">Diseña y guarda templates reutilizables para tus campañas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/templates/builder">
            <Button className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2">
              <Plus className="w-4 h-4" />
              Nuevo template
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong hover:shadow-sm transition-all group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-background-muted rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors">
                  <FileText className="w-5 h-5 text-foreground-muted group-hover:text-primary-foreground transition-colors" />
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl text-foreground-subtle hover:text-foreground hover:bg-background-muted">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <CardTitle className="text-base font-semibold text-foreground mt-3">{template.name}</CardTitle>
              <p className="text-sm text-foreground-subtle">{template.subject}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-foreground-subtle/60">
                Creado por {template.createdBy.name || template.createdBy.email}
              </p>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && !loading && (
          <Card className="border border-border bg-background-elev rounded-2xl shadow-none col-span-full">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-foreground-subtle/60" />
              </div>
              <p className="text-foreground-subtle font-medium">No hay templates creados</p>
              <p className="text-sm text-foreground-subtle/60 mt-1">Crea tu primer template para empezar</p>
              <Link href="/dashboard/templates/builder">
                <Button className="mt-4 h-10 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo template
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
