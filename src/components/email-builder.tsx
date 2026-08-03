"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Type,
  Image,
  Square,
  MousePointerClick,
  Minus,
  Heading,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
  Upload,
  Palette,
  FileImage,
} from "lucide-react"
import { TEMPLATE_PRESETS, type TemplatePreset } from "@/lib/email-templates"

export type BlockType = "header" | "text" | "image" | "button" | "divider" | "footer" | "column-2"

export interface EmailBlock {
  id: string
  type: BlockType
  content: Record<string, any>
}

const DEFAULT_BLOCK_CONTENT: Record<string, Record<string, any>> = {
  header: {
    logoUrl: "",
    logoText: "Tu Logo",
    logoAlign: "center",
    bgColor: "#ffffff",
    padding: 20,
  },
  text: {
    text: "Escribe tu texto aquí...",
    align: "left",
    fontSize: 16,
    color: "#1a1a1a",
    padding: 20,
    lineHeight: 1.6,
  },
  image: {
    src: "",
    alt: "Imagen",
    align: "center",
    width: "100%",
    padding: 20,
    borderRadius: 8,
  },
  button: {
    text: "Haz clic aquí",
    url: "https://",
    align: "center",
    bgColor: "#3fa844",
    textColor: "#ffffff",
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    fullWidth: false,
  },
  divider: {
    color: "#e5e5e5",
    height: 1,
    width: "100%",
    padding: 20,
  },
  footer: {
    text: "© 2026 Tu Empresa. Todos los derechos reservados.",
    align: "center",
    fontSize: 12,
    color: "#a3a3a3",
    padding: 20,
    bgColor: "#f5f5f5",
    showUnsubscribe: true,
    unsubscribeText: "Darse de baja",
  },
  "column-2": {
    left: {
      type: "text",
      content: { text: "Columna izquierda", align: "left", fontSize: 16, color: "#1a1a1a", lineHeight: 1.6 },
    },
    right: {
      type: "text",
      content: { text: "Columna derecha", align: "left", fontSize: 16, color: "#1a1a1a", lineHeight: 1.6 },
    },
    ratio: "50/50",
    gap: 20,
    bgColor: "#ffffff",
    padding: 20,
  },
  product: {
    imageSrc: "",
    imageAlt: "Producto",
    name: "Nombre del producto",
    description: "$0.00",
    buttonText: "Comprar",
    buttonUrl: "https://",
    buttonBgColor: "#3fa844",
    buttonTextColor: "#ffffff",
    align: "center",
    padding: 20,
    borderRadius: 8,
  },
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function renderBlockToHTML(block: EmailBlock): string {
  const c = block.content
  switch (block.type) {
    case "header":
      return `<tr>
        <td style="padding:${c.padding}px;background-color:${c.bgColor};text-align:${c.logoAlign};">
          ${c.logoUrl ? `<img src="${c.logoUrl}" alt="${c.logoText}" style="max-width:180px;height:auto;display:inline-block;" />` : `<span style="font-size:24px;font-weight:700;color:#1a1a1a;font-family:system-ui,sans-serif;">${c.logoText}</span>`}
        </td>
      </tr>`

    case "text":
      return `<tr>
        <td style="padding:${c.padding}px;text-align:${c.align};">
          <p style="margin:0;font-size:${c.fontSize}px;line-height:${c.lineHeight};color:${c.color};font-family:system-ui,sans-serif;">
            ${c.text.replace(/\n/g, "<br>")}
          </p>
        </td>
      </tr>`

    case "image":
      return `<tr>
        <td style="padding:${c.padding}px;text-align:${c.align};">
          <img src="${c.src || "https://via.placeholder.com/600x300/f5f5f5/a3a3a3?text=Tu+Imagen"}" alt="${c.alt}" style="width:${c.width};max-width:100%;height:auto;border-radius:${c.borderRadius}px;display:inline-block;" />
        </td>
      </tr>`

    case "button": {
      const btnWidth = c.fullWidth ? "width:100%;" : ""
      return `<tr>
        <td style="padding:${c.padding}px;text-align:${c.align};">
          <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;${btnWidth}">
            <tr>
              <td align="center" style="background-color:${c.bgColor};border-radius:${c.borderRadius}px;padding:${c.padding}px 24px;">
                <a href="${c.url}" target="_blank" style="display:inline-block;text-decoration:none;color:${c.textColor};font-size:${c.fontSize}px;font-weight:600;font-family:system-ui,sans-serif;">${c.text}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    }

    case "divider":
      return `<tr>
        <td style="padding:${c.padding}px 0;">
          <table width="${c.width}" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr><td style="border-top:${c.height}px solid ${c.color};font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>
        </td>
      </tr>`

    case "footer": {
      const unsub = c.showUnsubscribe
        ? ` | <a href="{{unsubscribeUrl}}" style="color:${c.color};text-decoration:underline;">${c.unsubscribeText}</a>`
        : ""
      return `<tr>
        <td style="padding:${c.padding}px;background-color:${c.bgColor};text-align:${c.align};">
          <p style="margin:0;font-size:${c.fontSize}px;color:${c.color};font-family:system-ui,sans-serif;">
            ${c.text}${unsub}
          </p>
        </td>
      </tr>`
    }

    case "column-2": {
      const ratios = c.ratio === "33/66" ? ["33%", "67%"] : c.ratio === "66/33" ? ["67%", "33%"] : ["50%", "50%"]
      const left = c.left || { type: "text", content: { text: "" } }
      const right = c.right || { type: "text", content: { text: "" } }
      
      const renderSub = (sub: any) => {
        if (!sub) return ""
        const sc = sub.content || {}
        if (sub.type === "text") {
          return `<p style="margin:0;font-size:${sc.fontSize || 16}px;line-height:${sc.lineHeight || 1.6};color:${sc.color || "#1a1a1a"};font-family:system-ui,sans-serif;">${(sc.text || "").replace(/\n/g, "<br>")}</p>`
        }
        if (sub.type === "image") {
          return `<img src="${sc.src || ""}" alt="${sc.alt || ""}" style="width:100%;max-width:100%;height:auto;border-radius:${sc.borderRadius || 0}px;display:block;" />`
        }
        if (sub.type === "button") {
          return `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td align="center" style="background-color:${sc.bgColor || "#3fa844"};border-radius:${sc.borderRadius || 8}px;padding:${sc.padding || 12}px 24px;"><a href="${sc.url || "#"}" target="_blank" style="display:inline-block;text-decoration:none;color:${sc.textColor || "#fff"};font-size:${sc.fontSize || 16}px;font-weight:600;font-family:system-ui,sans-serif;">${sc.text || "Botón"}</a></td></tr></table>`
        }
        if (sub.type === "product") {
          const img = sc.imageSrc
            ? `<img src="${sc.imageSrc}" alt="${sc.imageAlt || ""}" style="width:100%;max-width:100%;height:auto;border-radius:${sc.borderRadius || 8}px;display:block;margin-bottom:12px;" />`
            : `<div style="width:100%;height:160px;background:#f5f5f5;border-radius:${sc.borderRadius || 8}px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:14px;color:#a3a3a3;">Sin imagen</div>`
          const name = `<h3 style="margin:0 0 6px;font-size:18px;font-weight:600;color:#1a1a1a;font-family:system-ui,sans-serif;">${sc.name || "Producto"}</h3>`
          const desc = sc.description ? `<p style="margin:0 0 14px;font-size:14px;color:#525252;font-family:system-ui,sans-serif;">${sc.description}</p>` : ""
          const btn = `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td align="center" style="background-color:${sc.buttonBgColor || "#3fa844"};border-radius:${sc.borderRadius || 8}px;padding:12px 24px;"><a href="${sc.buttonUrl || "#"}" target="_blank" style="display:inline-block;text-decoration:none;color:${sc.buttonTextColor || "#ffffff"};font-size:16px;font-weight:600;font-family:system-ui,sans-serif;">${sc.buttonText || "Comprar"}</a></td></tr></table>`
          return `<div style="text-align:${sc.align || "center"};">${img}${name}${desc}${btn}</div>`
        }
        return ""
      }

      return `<tr>
        <td style="padding:${c.padding}px;background-color:${c.bgColor};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="${ratios[0]}" valign="top" style="padding-right:${c.gap / 2}px;">
                ${renderSub(left)}
              </td>
              <td width="${ratios[1]}" valign="top" style="padding-left:${c.gap / 2}px;">
                ${renderSub(right)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    }

    default:
      return ""
  }
}

export function generateEmailHTML(blocks: EmailBlock[]): string {
  const bodyRows = blocks.map(renderBlockToHTML).join("\n")
  return `<!DOCTYPE html>
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
          ${bodyRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function generateTextVersion(blocks: EmailBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "text") return b.content.text
      if (b.type === "button") return `${b.content.text}: ${b.content.url}`
      if (b.type === "footer") return b.content.text
      if (b.type === "header") return b.content.logoText
      if (b.type === "column-2") {
        const left = b.content.left?.content?.text || ""
        const right = b.content.right?.content?.text || ""
        return `${left}\n${right}`
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

/* ────────── Sidebar para agregar bloques ────────── */
function BlockPalette({ onAdd, brandColor }: { onAdd: (type: BlockType) => void; brandColor?: string }) {
  const items: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: "header", label: "Logo / Header", icon: <Heading className="w-4 h-4" /> },
    { type: "text", label: "Texto", icon: <Type className="w-4 h-4" /> },
    { type: "image", label: "Imagen", icon: <Image className="w-4 h-4" /> },
    { type: "button", label: "Botón", icon: <MousePointerClick className="w-4 h-4" /> },
    { type: "column-2", label: "2 Columnas", icon: <Columns className="w-4 h-4" /> },
    { type: "divider", label: "Separador", icon: <Minus className="w-4 h-4" /> },
    { type: "footer", label: "Footer", icon: <Square className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-foreground-subtle tracking-widest uppercase">Bloques</p>
      {brandColor && (
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-3.5 h-3.5 text-foreground-subtle" />
          <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: brandColor }} />
          <span className="text-xs text-foreground-subtle">Color de marca</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background-elev border border-border hover:border-primary hover:bg-primary/5 transition-all text-foreground-muted hover:text-primary"
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ────────── Selector de plantillas ────────── */
export function TemplateSelector({ onSelect }: { onSelect: (blocks: EmailBlock[]) => void }) {
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Palette className="w-8 h-8 text-foreground-subtle/60" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Elige una plantilla</h2>
        <p className="text-foreground-subtle mt-1">Selecciona un punto de partida o empieza desde cero</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATE_PRESETS.slice(0, showAll ? undefined : 4).map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.blocks)}
            className="p-5 rounded-2xl bg-background-elev border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
          >
            <div className="text-3xl mb-3">{preset.icon}</div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{preset.name}</h3>
            <p className="text-sm text-foreground-subtle mt-1">{preset.description}</p>
          </button>
        ))}

        <button
          onClick={() => onSelect([])}
          className="p-5 rounded-2xl bg-background-elev border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
        >
          <div className="text-3xl mb-3">➕</div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Desde cero</h3>
          <p className="text-sm text-foreground-subtle mt-1">Email vacío, tú decides todo</p>
        </button>
      </div>

      {TEMPLATE_PRESETS.length > 4 && (
        <div className="text-center mt-6">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary hover:underline"
          >
            {showAll ? "Ver menos" : `Ver ${TEMPLATE_PRESETS.length - 4} más`}
          </button>
        </div>
      )}
    </div>
  )
}

/* ────────── Subir imagen a base64 ────────── */
function ImageUploadField({
  value,
  onChange,
}: {
  value: string
  onChange: (base64: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("Solo se permiten imágenes")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB")
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      onChange(base64)
      setUploading(false)
    }
    reader.onerror = () => {
      alert("Error al leer la imagen")
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-foreground-subtle">Imagen</Label>
      {value && (
        <img src={value} alt="Preview" className="w-full max-h-32 object-contain rounded-lg border border-border" />
      )}
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          placeholder="https://... o sube un archivo"
          onChange={(e) => onChange(e.target.value)}
          className="h-8 rounded-lg border-border text-sm flex-1"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-8 px-3 rounded-lg bg-background-muted border border-border text-foreground-muted hover:text-foreground hover:bg-background-elev transition-all flex items-center gap-1.5 text-xs font-medium shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "..." : "Subir"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

/* ────────── Propiedades de cada bloque ────────── */
function BlockProperties({
  block,
  onChange,
}: {
  block: EmailBlock
  onChange: (content: Record<string, any>) => void
}) {
  const c = block.content

  const field = (label: string, key: string, type: "text" | "number" | "color" = "text", placeholder?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-foreground-subtle">{label}</Label>
      <Input
        type={type}
        value={c[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...c, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="h-8 rounded-lg border-border text-sm"
      />
    </div>
  )

  const textareaField = (label: string, key: string, rows = 3) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-foreground-subtle">{label}</Label>
      <Textarea
        value={c[key] ?? ""}
        onChange={(e) => onChange({ ...c, [key]: e.target.value })}
        rows={rows}
        className="rounded-lg border-border text-sm resize-none"
      />
    </div>
  )

  const alignField = (label: string, key: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-foreground-subtle">{label}</Label>
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            onClick={() => onChange({ ...c, [key]: a })}
            className={`flex-1 h-8 rounded-lg border flex items-center justify-center transition-all ${
              c[key] === a ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground-muted hover:bg-background-muted"
            }`}
          >
            {a === "left" && <AlignLeft className="w-3.5 h-3.5" />}
            {a === "center" && <AlignCenter className="w-3.5 h-3.5" />}
            {a === "right" && <AlignRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>
    </div>
  )

  const columnTypeField = (side: "left" | "right") => {
    const sub = c[side] || { type: "text", content: {} }
    const setSub = (type: "text" | "image" | "button" | "product") => {
      const defaults: Record<string, any> =
        type === "text"
          ? { text: "Texto...", align: "left", fontSize: 16, color: "#1a1a1a", lineHeight: 1.6 }
          : type === "image"
          ? { src: "", alt: "", align: "center", width: "100%", borderRadius: 0 }
          : type === "button"
          ? { text: "Botón", url: "https://", align: "center", bgColor: "#3fa844", textColor: "#fff", fontSize: 16, padding: 12, borderRadius: 8, fullWidth: false }
          : { imageSrc: "", imageAlt: "Producto", name: "Nombre del producto", description: "$0.00", buttonText: "Comprar", buttonUrl: "https://", buttonBgColor: "#3fa844", buttonTextColor: "#ffffff", align: "center", borderRadius: 8 }
      onChange({ ...c, [side]: { type, content: { ...defaults, ...sub.content } } })
    }

    const updateSubContent = (content: Record<string, any>) => {
      onChange({ ...c, [side]: { ...sub, content: { ...sub.content, ...content } } })
    }

    return (
      <div className="space-y-2 border border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground-subtle uppercase">{side === "left" ? "Izquierda" : "Derecha"}</span>
          <div className="flex gap-1">
            {(["text", "image", "button", "product"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSub(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-all ${
                  sub.type === t ? "bg-primary text-primary-foreground" : "bg-background-muted text-foreground-muted hover:bg-background-elev"
                }`}
              >
                {t === "product" ? "producto" : t}
              </button>
            ))}
          </div>
        </div>
        {sub.type === "text" && (
          <>
            <Textarea
              value={sub.content?.text || ""}
              onChange={(e) => updateSubContent({ text: e.target.value })}
              rows={3}
              className="rounded-lg border-border text-sm resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={sub.content?.fontSize || 16} onChange={(e) => updateSubContent({ fontSize: Number(e.target.value) })} className="h-7 text-xs" placeholder="Tamaño" />
              <Input type="color" value={sub.content?.color || "#1a1a1a"} onChange={(e) => updateSubContent({ color: e.target.value })} className="h-7 text-xs p-1" />
            </div>
          </>
        )}
        {sub.type === "image" && (
          <ImageUploadField value={sub.content?.src || ""} onChange={(src) => updateSubContent({ src })} />
        )}
        {sub.type === "button" && (
          <>
            <Input value={sub.content?.text || ""} onChange={(e) => updateSubContent({ text: e.target.value })} className="h-7 text-xs" placeholder="Texto" />
            <Input value={sub.content?.url || ""} onChange={(e) => updateSubContent({ url: e.target.value })} className="h-7 text-xs" placeholder="URL" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="color" value={sub.content?.bgColor || "#3fa844"} onChange={(e) => updateSubContent({ bgColor: e.target.value })} className="h-7 text-xs p-1" />
              <Input type="color" value={sub.content?.textColor || "#fff"} onChange={(e) => updateSubContent({ textColor: e.target.value })} className="h-7 text-xs p-1" />
            </div>
          </>
        )}
        {sub.type === "product" && (
          <>
            <ImageUploadField value={sub.content?.imageSrc || ""} onChange={(imageSrc) => updateSubContent({ imageSrc })} />
            <Input value={sub.content?.name || ""} onChange={(e) => updateSubContent({ name: e.target.value })} className="h-7 text-xs" placeholder="Nombre del producto" />
            <Input value={sub.content?.description || ""} onChange={(e) => updateSubContent({ description: e.target.value })} className="h-7 text-xs" placeholder="Precio o descripción" />
            <Input value={sub.content?.buttonText || ""} onChange={(e) => updateSubContent({ buttonText: e.target.value })} className="h-7 text-xs" placeholder="Texto del botón" />
            <Input value={sub.content?.buttonUrl || ""} onChange={(e) => updateSubContent({ buttonUrl: e.target.value })} className="h-7 text-xs" placeholder="URL del botón" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="color" value={sub.content?.buttonBgColor || "#3fa844"} onChange={(e) => updateSubContent({ buttonBgColor: e.target.value })} className="h-7 text-xs p-1" />
              <Input type="color" value={sub.content?.buttonTextColor || "#fff"} onChange={(e) => updateSubContent({ buttonTextColor: e.target.value })} className="h-7 text-xs p-1" />
            </div>
          </>
        )}
      </div>
    )
  }

  switch (block.type) {
    case "header":
      return (
        <div className="space-y-3">
          {field("Texto del logo", "logoText")}
          <ImageUploadField value={c.logoUrl || ""} onChange={(logoUrl) => onChange({ ...c, logoUrl })} />
          {alignField("Alineación", "logoAlign")}
          {field("Color de fondo", "bgColor", "color")}
          {field("Padding", "padding", "number")}
        </div>
      )

    case "text":
      return (
        <div className="space-y-3">
          {textareaField("Texto", "text", 5)}
          {alignField("Alineación", "align")}
          {field("Tamaño de fuente", "fontSize", "number")}
          {field("Color", "color", "color")}
          {field("Padding", "padding", "number")}
          {field("Interlineado", "lineHeight", "number")}
        </div>
      )

    case "image":
      return (
        <div className="space-y-3">
          <ImageUploadField value={c.src || ""} onChange={(src) => onChange({ ...c, src })} />
          {field("Texto alternativo", "alt")}
          {alignField("Alineación", "align")}
          {field("Ancho", "width")}
          {field("Padding", "padding", "number")}
          {field("Radio de borde", "borderRadius", "number")}
        </div>
      )

    case "button":
      return (
        <div className="space-y-3">
          {field("Texto", "text")}
          {field("URL", "url")}
          {alignField("Alineación", "align")}
          <div className="grid grid-cols-2 gap-2">
            {field("Color de fondo", "bgColor", "color")}
            {field("Color de texto", "textColor", "color")}
          </div>
          {field("Tamaño de fuente", "fontSize", "number")}
          {field("Padding", "padding", "number")}
          {field("Radio de borde", "borderRadius", "number")}
          <label className="flex items-center gap-2 text-sm text-foreground-muted cursor-pointer">
            <input
              type="checkbox"
              checked={!!c.fullWidth}
              onChange={(e) => onChange({ ...c, fullWidth: e.target.checked })}
              className="rounded border-border"
            />
            Ancho completo
          </label>
        </div>
      )

    case "divider":
      return (
        <div className="space-y-3">
          {field("Color", "color", "color")}
          {field("Altura", "height", "number")}
          {field("Ancho", "width")}
          {field("Padding", "padding", "number")}
        </div>
      )

    case "footer":
      return (
        <div className="space-y-3">
          {textareaField("Texto", "text", 2)}
          {alignField("Alineación", "align")}
          {field("Tamaño de fuente", "fontSize", "number")}
          {field("Color", "color", "color")}
          {field("Color de fondo", "bgColor", "color")}
          {field("Padding", "padding", "number")}
          {field("Texto de baja", "unsubscribeText")}
          <label className="flex items-center gap-2 text-sm text-foreground-muted cursor-pointer">
            <input
              type="checkbox"
              checked={!!c.showUnsubscribe}
              onChange={(e) => onChange({ ...c, showUnsubscribe: e.target.checked })}
              className="rounded border-border"
            />
            Mostrar link de baja
          </label>
        </div>
      )

    case "column-2":
      return (
        <div className="space-y-3">
          {columnTypeField("left")}
          {columnTypeField("right")}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground-subtle">Ratio</Label>
            <select
              value={c.ratio || "50/50"}
              onChange={(e) => onChange({ ...c, ratio: e.target.value })}
              className="w-full h-8 rounded-lg border border-border bg-background text-sm px-2"
            >
              <option value="50/50">50% / 50%</option>
              <option value="33/66">33% / 66%</option>
              <option value="66/33">66% / 33%</option>
            </select>
          </div>
          {field("Espacio entre columnas", "gap", "number")}
          {field("Color de fondo", "bgColor", "color")}
          {field("Padding", "padding", "number")}
        </div>
      )

    default:
      return null
  }
}

/* ────────── Vista previa de bloque en el canvas ────────── */
function BlockPreview({ block }: { block: EmailBlock }) {
  const c = block.content
  switch (block.type) {
    case "header":
      return (
        <div style={{ padding: c.padding, backgroundColor: c.bgColor, textAlign: c.logoAlign }}>
          {c.logoUrl ? (
            <img src={c.logoUrl} alt={c.logoText} className="max-w-[180px] h-auto inline-block" />
          ) : (
            <span className="text-2xl font-bold text-foreground">{c.logoText}</span>
          )}
        </div>
      )

    case "text":
      return (
        <div style={{ padding: c.padding, textAlign: c.align }}>
          <p style={{ margin: 0, fontSize: c.fontSize, lineHeight: c.lineHeight, color: c.color }}>
            {c.text}
          </p>
        </div>
      )

    case "image":
      return (
        <div style={{ padding: c.padding, textAlign: c.align }}>
          {c.src ? (
            <img
              src={c.src}
              alt={c.alt}
              className="max-w-full h-auto inline-block"
              style={{ width: c.width, borderRadius: c.borderRadius }}
            />
          ) : (
            <div className="w-full h-32 bg-background-muted rounded-lg flex items-center justify-center text-foreground-subtle">
              <FileImage className="w-8 h-8 mr-2" />
              <span className="text-sm">Sin imagen</span>
            </div>
          )}
        </div>
      )

    case "button": {
      const widthClass = c.fullWidth ? "w-full" : "inline-block"
      return (
        <div style={{ padding: c.padding, textAlign: c.align }}>
          <a
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className={`${widthClass} no-underline font-semibold text-center transition-opacity hover:opacity-90`}
            style={{
              backgroundColor: c.bgColor,
              color: c.textColor,
              fontSize: c.fontSize,
              padding: `${c.padding}px 24px`,
              borderRadius: c.borderRadius,
              display: "inline-block",
            }}
          >
            {c.text}
          </a>
        </div>
      )
    }

    case "divider":
      return (
        <div style={{ padding: `${c.padding}px 0` }}>
          <div
            style={{
              width: c.width,
              height: c.height,
              backgroundColor: c.color,
              margin: "0 auto",
            }}
          />
        </div>
      )

    case "footer": {
      const unsub = c.showUnsubscribe ? ` | ${c.unsubscribeText}` : ""
      return (
        <div style={{ padding: c.padding, backgroundColor: c.bgColor, textAlign: c.align }}>
          <p style={{ margin: 0, fontSize: c.fontSize, color: c.color }}>
            {c.text}{unsub}
          </p>
        </div>
      )
    }

    case "column-2": {
      const left = c.left || { type: "text", content: { text: "" } }
      const right = c.right || { type: "text", content: { text: "" } }
      const ratios = c.ratio === "33/66" ? ["33%", "67%"] : c.ratio === "66/33" ? ["67%", "33%"] : ["50%", "50%"]

      const renderSubPreview = (sub: any) => {
        if (!sub) return null
        const sc = sub.content || {}
        if (sub.type === "text") {
          return <p style={{ margin: 0, fontSize: sc.fontSize || 16, lineHeight: sc.lineHeight || 1.6, color: sc.color || "#1a1a1a" }}>{sc.text || ""}</p>
        }
        if (sub.type === "image") {
          return sc.src ? <img src={sc.src} alt="" className="w-full h-auto" style={{ borderRadius: sc.borderRadius || 0 }} /> : <div className="w-full h-16 bg-background-muted rounded flex items-center justify-center text-foreground-subtle text-xs">Sin imagen</div>
        }
        if (sub.type === "button") {
          return (
            <span
              className="inline-block font-semibold"
              style={{ backgroundColor: sc.bgColor || "#3fa844", color: sc.textColor || "#fff", padding: "8px 16px", borderRadius: sc.borderRadius || 8 }}
            >
              {sc.text || "Botón"}
            </span>
          )
        }
        if (sub.type === "product") {
          return (
            <div className="space-y-2" style={{ textAlign: sc.align || "center" }}>
              {sc.imageSrc ? (
                <img src={sc.imageSrc} alt={sc.imageAlt || ""} className="w-full h-auto" style={{ borderRadius: sc.borderRadius || 8 }} />
              ) : (
                <div className="w-full h-20 bg-background-muted rounded flex items-center justify-center text-foreground-subtle text-xs">Sin imagen</div>
              )}
              <h4 className="font-semibold text-sm m-0">{sc.name || "Producto"}</h4>
              {sc.description && <p className="text-xs text-foreground-subtle m-0">{sc.description}</p>}
              <span
                className="inline-block font-semibold text-xs"
                style={{ backgroundColor: sc.buttonBgColor || "#3fa844", color: sc.buttonTextColor || "#fff", padding: "6px 12px", borderRadius: sc.borderRadius || 8 }}
              >
                {sc.buttonText || "Comprar"}
              </span>
            </div>
          )
        }
        return null
      }

      return (
        <div style={{ padding: c.padding, backgroundColor: c.bgColor }}>
          <div className="flex gap-4">
            <div style={{ width: ratios[0] }}>{renderSubPreview(left)}</div>
            <div style={{ width: ratios[1] }}>{renderSubPreview(right)}</div>
          </div>
        </div>
      )
    }

    default:
      return null
  }
}

/* ────────── Componente principal ────────── */
export function EmailBuilder({
  initialBlocks = [],
  brandColor,
  onChange,
}: {
  initialBlocks?: EmailBlock[]
  brandColor?: string
  onChange?: (blocks: EmailBlock[], html: string, text: string) => void
}) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSelector, setShowSelector] = useState(initialBlocks.length === 0)

  const updateBlocks = useCallback(
    (newBlocks: EmailBlock[]) => {
      setBlocks(newBlocks)
      const html = generateEmailHTML(newBlocks)
      const text = generateTextVersion(newBlocks)
      onChange?.(newBlocks, html, text)
    },
    [onChange]
  )

  const addBlock = (type: BlockType) => {
    const defaults = { ...DEFAULT_BLOCK_CONTENT[type] }
    // Aplicar brandColor a botones por defecto
    if (type === "button" && brandColor) {
      defaults.bgColor = brandColor
    }
    const newBlock: EmailBlock = {
      id: generateId(),
      type,
      content: defaults,
    }
    const newBlocks = [...blocks, newBlock]
    updateBlocks(newBlocks)
    setSelectedId(newBlock.id)
  }

  const updateBlock = (id: string, content: Record<string, any>) => {
    const newBlocks = blocks.map((b) => (b.id === id ? { ...b, content } : b))
    updateBlocks(newBlocks)
  }

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return
    const newBlocks = [...blocks]
    const [moved] = newBlocks.splice(index, 1)
    newBlocks.splice(newIndex, 0, moved)
    updateBlocks(newBlocks)
  }

  const removeBlock = (id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id)
    updateBlocks(newBlocks)
    if (selectedId === id) setSelectedId(null)
  }

  const handleSelectTemplate = (templateBlocks: EmailBlock[]) => {
    // Aplicar brandColor a botones en las plantillas
    const blocksWithBrand = templateBlocks.map((b) => {
      if (b.type === "button" && brandColor) {
        return { ...b, content: { ...b.content, bgColor: brandColor } }
      }
      return b
    })
    setShowSelector(false)
    updateBlocks(blocksWithBrand)
  }

  const selectedBlock = blocks.find((b) => b.id === selectedId)

  if (showSelector) {
    return (
      <div className="h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        <TemplateSelector onSelect={handleSelectTemplate} />
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Sidebar: bloques disponibles */}
      <div className="w-56 shrink-0 space-y-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground-subtle tracking-widest uppercase">Bloques</p>
          <button
            onClick={() => setShowSelector(true)}
            className="text-xs text-primary hover:underline"
          >
            Cambiar plantilla
          </button>
        </div>

        <BlockPalette onAdd={addBlock} brandColor={brandColor} />

        {selectedBlock && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-bold text-foreground-subtle tracking-widest uppercase">Propiedades</p>
            <BlockProperties block={selectedBlock} onChange={(content) => updateBlock(selectedBlock.id, content)} />
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-background-sunken rounded-2xl border border-border p-6">
        <div className="max-w-[600px] mx-auto">
          {blocks.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-foreground-subtle/60" />
              </div>
              <p className="text-foreground-subtle font-medium">Tu email está vacío</p>
              <p className="text-sm text-foreground-subtle/60 mt-1">Agrega bloques desde el panel de la izquierda</p>
              <button
                onClick={() => setShowSelector(true)}
                className="mt-4 text-sm text-primary hover:underline"
              >
                O elige una plantilla
              </button>
            </div>
          )}

          {blocks.map((block, index) => (
            <div
              key={block.id}
              onClick={() => setSelectedId(block.id)}
              className={`relative group cursor-pointer rounded-xl transition-all ${
                selectedId === block.id
                  ? "ring-2 ring-primary ring-offset-2"
                  : "hover:ring-1 hover:ring-border-strong hover:ring-offset-1"
              }`}
            >
              {/* Toolbar flotante */}
              <div className="absolute -right-2 -top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveBlock(index, "up")
                  }}
                  disabled={index === 0}
                  className="w-7 h-7 rounded-lg bg-background-elev border border-border flex items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3L3 6M6 3L9 6M6 3V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveBlock(index, "down")
                  }}
                  disabled={index === blocks.length - 1}
                  className="w-7 h-7 rounded-lg bg-background-elev border border-border flex items-center justify-center text-foreground-muted hover:text-foreground disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9L3 6M6 9L9 6M6 9V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeBlock(block.id)
                  }}
                  className="w-7 h-7 rounded-lg bg-background-elev border border-border flex items-center justify-center text-foreground-muted hover:text-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <Card className="border-0 shadow-none bg-white">
                <CardContent className="p-0">
                  <BlockPreview block={block} />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
