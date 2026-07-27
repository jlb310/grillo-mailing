"use client"

import { useEffect, useState } from "react"
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
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    const res = await fetch("/api/templates")
    const data = await res.json()
    setTemplates(data)
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">Templates</h1>
          <p className="text-[#737373] mt-2 text-lg">Diseña y guarda templates reutilizables para tus campañas</p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button className="h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2">
            <Plus className="w-4 h-4" />
            Nuevo template
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none hover:border-[#d4d4d4] hover:shadow-sm transition-all group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-[#f5f5f5] rounded-xl flex items-center justify-center group-hover:bg-[#1a1a1a] transition-colors">
                  <FileText className="w-5 h-5 text-[#525252] group-hover:text-white transition-colors" />
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl text-[#a3a3a3] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <CardTitle className="text-base font-semibold text-[#1a1a1a] mt-3">{template.name}</CardTitle>
              <p className="text-sm text-[#a3a3a3]">{template.subject}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#d4d4d4]">
                Creado por {template.createdBy.name || template.createdBy.email}
              </p>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && !loading && (
          <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none col-span-full">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-[#f5f5f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#d4d4d4]" />
              </div>
              <p className="text-[#a3a3a3] font-medium">No hay templates creados</p>
              <p className="text-sm text-[#d4d4d4] mt-1">Crea tu primer template para empezar</p>
              <Link href="/dashboard/templates/new">
                <Button className="mt-4 h-10 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm">
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
