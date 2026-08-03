"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { EmailBuilder, type EmailBlock, generateEmailHTML, generateTextVersion } from "@/components/email-builder"
import { ArrowLeft, Save, Eye, Code } from "lucide-react"
import Link from "next/link"

export default function TemplateBuilderPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPERADMIN"

  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [htmlContent, setHtmlContent] = useState("")
  const [textContent, setTextContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const handleBlocksChange = (newBlocks: EmailBlock[], html: string, text: string) => {
    setBlocks(newBlocks)
    setHtmlContent(html)
    setTextContent(text)
  }

  const handleSave = async () => {
    if (!name || !subject) {
      alert("Completa el nombre y el asunto del template")
      return
    }
    if (blocks.length === 0) {
      alert("Agrega al menos un bloque al email")
      return
    }

    setSaving(true)
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const payload = {
      name,
      subject,
      htmlContent,
      textContent,
      ...(activeOrg ? { organizationId: activeOrg } : {}),
    }

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      router.push("/dashboard/templates")
    } else {
      const data = await res.json()
      alert(data.error || "No se pudo guardar el template")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="sm" className="rounded-xl h-9 text-foreground-muted hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl text-foreground">Email Builder</h1>
            <p className="text-foreground-subtle mt-1">Arma tu email arrastrando bloques</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setPreviewMode(!previewMode); setShowCode(false) }}
            className="h-10 rounded-xl border-border text-foreground hover:bg-background-muted"
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? "Editar" : "Vista previa"}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowCode(!showCode); setPreviewMode(false) }}
            className="h-10 rounded-xl border-border text-foreground hover:bg-background-muted"
          >
            <Code className="w-4 h-4 mr-2" />
            {showCode ? "Ocultar código" : "Ver HTML"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-10 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar template"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-foreground-muted">Nombre del template</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Newsletter mensual"
                  className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm text-foreground-muted">Asunto del email</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Novedades de este mes"
                  className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-foreground-subtle tracking-widest uppercase mb-3">Variables</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: "firstName", desc: "Nombre" },
                  { label: "lastName", desc: "Apellido" },
                  { label: "email", desc: "Email" },
                  { label: "subject", desc: "Asunto" },
                  { label: "organizationName", desc: "Organización" },
                  { label: "unsubscribeUrl", desc: "Baja" },
                ].map((v) => (
                  <div key={v.label} className="flex items-center justify-between">
                    <code className="bg-background-muted px-2 py-1 rounded-lg text-xs text-foreground-muted">{`{{${v.label}}}`}</code>
                    <span className="text-xs text-foreground-subtle">{v.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {previewMode ? (
            <Card className="border border-border bg-background-elev rounded-2xl shadow-none h-[calc(100vh-200px)]">
              <CardContent className="p-0 h-full">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full border-0 rounded-2xl"
                  title="Preview"
                />
              </CardContent>
            </Card>
          ) : showCode ? (
            <Card className="border border-border bg-background-elev rounded-2xl shadow-none h-[calc(100vh-200px)]">
              <CardContent className="p-0 h-full">
                <textarea
                  value={htmlContent}
                  readOnly
                  className="w-full h-full p-5 font-mono text-sm bg-background-sunken border-0 resize-none focus:outline-none focus:ring-0 rounded-2xl"
                  spellCheck={false}
                />
              </CardContent>
            </Card>
          ) : (
            <EmailBuilder onChange={handleBlocksChange} />
          )}
        </div>
      </div>
    </div>
  )
}
