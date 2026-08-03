"use client"

import { useState, useCallback } from "react"
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
  GripVertical,
  Plus,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react"

export type BlockType = "header" | "text" | "image" | "button" | "divider" | "footer"

export interface EmailBlock {
  id: string
  type: BlockType
  content: Record<string, any>
}

const DEFAULT_BLOCK_CONTENT: Record<BlockType, Record<string, any>> = {
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
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

/* ────────── Sidebar para agregar bloques ────────── */
function BlockPalette({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const items: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: "header", label: "Logo / Header", icon: <Heading className="w-4 h-4" /> },
    { type: "text", label: "Texto", icon: <Type className="w-4 h-4" /> },
    { type: "image", label: "Imagen", icon: <Image className="w-4 h-4" /> },
    { type: "button", label: "Botón", icon: <MousePointerClick className="w-4 h-4" /> },
    { type: "divider", label: "Separador", icon: <Minus className="w-4 h-4" /> },
    { type: "footer", label: "Footer", icon: <Square className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-foreground-subtle tracking-widest uppercase">Bloques</p>
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

  switch (block.type) {
    case "header":
      return (
        <div className="space-y-3">
          {field("Texto del logo", "logoText")}
          {field("URL del logo", "logoUrl", "text", "https://...")}
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
          {field("URL de la imagen", "src", "text", "https://...")}
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
          <img
            src={c.src || "https://via.placeholder.com/600x300/f5f5f5/a3a3a3?text=Tu+Imagen"}
            alt={c.alt}
            className="max-w-full h-auto inline-block"
            style={{ width: c.width, borderRadius: c.borderRadius }}
          />
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

    default:
      return null
  }
}

/* ────────── Componente principal ────────── */
export function EmailBuilder({
  initialBlocks = [],
  onChange,
}: {
  initialBlocks?: EmailBlock[]
  onChange?: (blocks: EmailBlock[], html: string, text: string) => void
}) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
    const newBlock: EmailBlock = {
      id: generateId(),
      type,
      content: { ...DEFAULT_BLOCK_CONTENT[type] },
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

  const selectedBlock = blocks.find((b) => b.id === selectedId)

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Sidebar: bloques disponibles */}
      <div className="w-56 shrink-0 space-y-6 overflow-y-auto custom-scrollbar">
        <BlockPalette onAdd={addBlock} />

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
