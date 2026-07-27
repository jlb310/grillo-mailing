"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Editor } from "@tinymce/tinymce-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Eye } from "lucide-react"
import Link from "next/link"

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#1a1a1a;">
                {{subject}}
              </h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#525252;">
                Escribe tu contenido aquí...
              </p>
              <p style="margin:0;font-size:14px;color:#737373;">
                Saludos,<br>El equipo de Grillo
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#f5f5f5;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#a3a3a3;text-align:center;">
                {{organizationName}} | <a href="{{unsubscribeUrl}}" style="color:#a3a3a3;">Darse de baja</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

export default function NewTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML)
  const [textContent, setTextContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const handleEditorChange = (content: string) => {
    setHtmlContent(content)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, htmlContent, textContent }),
    })
    setSaving(false)
    if (res.ok) {
      router.push("/dashboard/templates")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="sm" className="rounded-xl h-9 text-[#737373] hover:text-[#1a1a1a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">Nuevo template</h1>
            <p className="text-[#a3a3a3] mt-1">Diseña tu template de email con el editor visual</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)} className="h-10 rounded-xl border-[#e5e5e5] text-[#1a1a1a] hover:bg-[#f5f5f5]">
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? "Editar" : "Vista previa"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-10 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-sm font-medium gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar template"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-[#525252]">Nombre del template</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Newsletter mensual"
                  className="h-11 rounded-xl border-[#e5e5e5] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm text-[#525252]">Asunto del email</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Novedades de este mes"
                  className="h-11 rounded-xl border-[#e5e5e5] focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10"
                />
              </div>
            </CardContent>
          </Card>

          {!previewMode ? (
            <Tabs defaultValue="visual" className="w-full">
              <TabsList className="bg-[#f5f5f5] rounded-xl h-10 p-1">
                <TabsTrigger value="visual" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1a1a1a] data-[state=active]:shadow-sm">Editor Visual</TabsTrigger>
                <TabsTrigger value="html" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1a1a1a] data-[state=active]:shadow-sm">HTML</TabsTrigger>
                <TabsTrigger value="text" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1a1a1a] data-[state=active]:shadow-sm">Texto plano</TabsTrigger>
              </TabsList>
              <TabsContent value="visual" className="mt-3">
                <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none overflow-hidden">
                  <CardContent className="p-0">
                    <Editor
                      apiKey="no-api-key"
                      init={{
                        height: 500,
                        menubar: false,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                          'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks | ' +
                          'bold italic forecolor | alignleft aligncenter ' +
                          'alignright alignjustify | bullist numlist outdent indent | ' +
                          'removeformat | help',
                        content_style: 'body { font-family:system-ui,-apple-system,sans-serif; font-size:14px; color:#1a1a1a; }',
                        skin: 'oxide',
                        content_css: 'default',
                        branding: false,
                        promotion: false,
                      }}
                      value={htmlContent}
                      onEditorChange={handleEditorChange}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="html" className="mt-3">
                <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
                  <CardContent className="p-0">
                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      className="w-full h-[500px] p-5 font-mono text-sm bg-[#fafafa] border-0 resize-none focus:outline-none focus:ring-0 rounded-2xl"
                      spellCheck={false}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="text" className="mt-3">
                <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
                  <CardContent className="p-0">
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="w-full h-[500px] p-5 font-mono text-sm bg-[#fafafa] border-0 resize-none focus:outline-none focus:ring-0 rounded-2xl"
                      placeholder="Versión en texto plano del email..."
                      spellCheck={false}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
              <CardContent className="p-0">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-[600px] border-0 rounded-2xl"
                  title="Preview"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border border-[#e5e5e5] bg-white rounded-2xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#1a1a1a]">Variables disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: "firstName", desc: "Nombre del contacto" },
                { label: "lastName", desc: "Apellido del contacto" },
                { label: "email", desc: "Email del contacto" },
                { label: "subject", desc: "Asunto de la campaña" },
                { label: "organizationName", desc: "Nombre de la organización" },
                { label: "unsubscribeUrl", desc: "Link de baja" },
              ].map((v) => (
                <div key={v.label} className="flex items-center justify-between">
                  <code className="bg-[#f5f5f5] px-2 py-1 rounded-lg text-xs text-[#525252]">{`{{${v.label}}}`}</code>
                  <span className="text-xs text-[#a3a3a3]">{v.desc}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
