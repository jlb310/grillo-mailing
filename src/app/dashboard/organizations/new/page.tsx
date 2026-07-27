"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Building2, Save } from "lucide-react"
import Link from "next/link"

export default function NewOrganizationPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    setSaving(false)
    if (res.ok) {
      router.push("/dashboard/organizations")
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/organizations">
          <Button variant="ghost" size="sm" className="rounded-xl h-9 text-[#737373] hover:text-[#1a1a1a]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">Nueva organización</h1>
          <p className="text-[#a3a3a3] mt-1">Crea un nuevo cliente en la plataforma</p>
        </div>
      </div>

      <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-[#525252]">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setFormData({
                    ...formData,
                    name,
                    slug: formData.slug || generateSlug(name),
                  })
                }}
                placeholder="Ej: Acme Corp"
                required
                className="h-11 rounded-xl border-[#e5e5e5] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm text-[#525252]">Slug (identificador único)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="acme-corp"
                required
                className="h-11 rounded-xl border-[#e5e5e5] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm text-[#525252]">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la organización..."
                rows={3}
                className="rounded-xl border-[#e5e5e5] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10 resize-none"
              />
            </div>
            <Button
              type="submit"
              className="h-11 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Crear organización"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
