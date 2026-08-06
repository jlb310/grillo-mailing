"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { buildEmailHtml, EmailBuilderFields } from "@/lib/email-builder";
import { ArrowLeft, Save, Eye, EyeOff, Plus, Trash2, Upload, Palette, Layout, AlignCenter } from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/rich-text-editor";

interface EmpresaOption { id: string; name: string }
interface CtaButton { id: string; text: string; url: string; color: string }

const HEADER_COLORS = [
  "#207029", "#1e40af", "#7c3aed", "#be185d",
  "#b45309", "#15803d", "#1f2937", "#dc2626",
];

function uid() { return Math.random().toString(36).slice(2); }

type Tab = "diseno" | "contenido" | "footer";

function EmailBuilderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const defaultEmpresaId = searchParams.get("empresaId") ?? "";

  const [empresaId, setEmpresaId] = useState(defaultEmpresaId);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [tab, setTab] = useState<Tab>("contenido");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  // Design
  const logoFileRef = useRef<HTMLInputElement>(null);
  const logoRightFileRef = useRef<HTMLInputElement>(null);
  const logoRight2FileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoRight, setUploadingLogoRight] = useState(false);
  const [uploadingLogoRight2, setUploadingLogoRight2] = useState(false);
  const [logoUrl, setLogoUrl] = useState("/grillo-mark.png");
  const [logoAlt, setLogoAlt] = useState("Grillo");
  const [logoHeight, setLogoHeight] = useState("48px");
  const [logoAlign, setLogoAlign] = useState<"left" | "center" | "right">("left");
  const [logoRightUrl, setLogoRightUrl] = useState("");
  const [logoRightHeight, setLogoRightHeight] = useState("48px");
  const [logoRight2Url, setLogoRight2Url] = useState("");
  const [logoRight2Height, setLogoRight2Height] = useState("48px");
  const [headerColor, setHeaderColor] = useState("#207029");
  const [emailDate, setEmailDate] = useState("");
  const [emailLocation, setEmailLocation] = useState("");
  const [eventInfoButtons, setEventInfoButtons] = useState(false);

  // Iconos circulares (fecha + documento con link)
  const [iconDate, setIconDate] = useState("");
  const [iconLinkText, setIconLinkText] = useState("");
  const [iconLinkUrl, setIconLinkUrl] = useState("");

  // Programa PDF
  const programaFileRef = useRef<HTMLInputElement>(null);
  const [uploadingPrograma, setUploadingPrograma] = useState(false);
  const [programaUrl, setProgramaUrl] = useState("");

  // Content
  const [emailTitle, setEmailTitle] = useState("");
  const [emailSubtitle, setEmailSubtitle] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [ctaButtons, setCtaButtons] = useState<CtaButton[]>([]);

  // Footer
  const [footerText, setFooterText] = useState("Grillo Mailing — correo.grillo.click");
  const [useAlemanaFooter, setUseAlemanaFooter] = useState(true);

  useEffect(() => {
    fetch("/api/empresas").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setEmpresas(d); });
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/campanas/${editId}`).then((r) => r.json()).then((c) => {
      if (!c?.id) return;
      setEmpresaId(c.empresaId);
      setLogoUrl(c.logoUrl ?? "");
      setLogoAlt(c.logoAlt ?? "Grillo");
      setLogoHeight(c.logoHeight ?? "48px");
      setLogoAlign((c.logoAlign as "left" | "center" | "right") ?? "left");
      setLogoRightUrl(c.logoRightUrl ?? "");
      setLogoRightHeight(c.logoRightHeight ?? "48px");
      setLogoRight2Url(c.logoRight2Url ?? "");
      setLogoRight2Height(c.logoRight2Height ?? "48px");
      setHeaderColor(c.headerColor ?? "#207029");
      setEmailDate(c.emailDate ?? "");
      setEmailLocation(c.emailLocation ?? "");
      setEventInfoButtons(c.eventInfoButtons ?? false);
      setIconDate(c.iconDate ?? "");
      setIconLinkText(c.iconLinkText ?? "");
      setIconLinkUrl(c.iconLinkUrl ?? "");
      setUseAlemanaFooter(c.useAlemanaFooter ?? true);
      setProgramaUrl(c.programaUrl ?? "");
      setEmailTitle(c.emailTitle ?? "");
      setEmailSubtitle(c.emailSubtitle ?? "");
      setFooterText(c.footerText ?? "Grillo Mailing — correo.grillo.click");
      // Load body and CTA buttons
      if (c.ctaButtons && Array.isArray(c.ctaButtons)) {
        setCtaButtons(c.ctaButtons as CtaButton[]);
      } else if (c.ctaText && c.ctaUrl) {
        setCtaButtons([{ id: uid(), text: c.ctaText, url: c.ctaUrl, color: c.headerColor ?? "#207029" }]);
      }
      if (c.emailBody) setEmailBody(c.emailBody);
    });
  }, [editId]);

  const builderFields: EmailBuilderFields = useMemo(() => ({
    logoUrl, logoAlt, logoHeight, logoAlign, logoRightUrl, logoRightHeight, logoRight2Url, logoRight2Height, headerColor,
    emailTitle, emailSubtitle, emailDate, emailLocation, eventInfoButtons,
    iconDate, iconLinkText, iconLinkUrl,
    emailBody, ctaButtons, footerText, useAlemanaFooter,
  }), [logoUrl, logoAlt, logoHeight, logoAlign, logoRightUrl, logoRightHeight, logoRight2Url, logoRight2Height, headerColor, emailTitle, emailSubtitle, emailDate, emailLocation, eventInfoButtons, iconDate, iconLinkText, iconLinkUrl, emailBody, ctaButtons, footerText, useAlemanaFooter]);

  const previewHtml = useMemo(() => buildEmailHtml(builderFields), [builderFields]);

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "logos");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (data.url) {
      setLogoUrl(data.url);
    } else {
      setError(data.error ?? "No se pudo subir el logo. Inténtalo de nuevo.");
    }
    setUploadingLogo(false);
  }

  async function uploadLogoRight(file: File) {
    setUploadingLogoRight(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "logos");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (data.url) {
      setLogoRightUrl(data.url);
    } else {
      setError(data.error ?? "No se pudo subir el logo. Inténtalo de nuevo.");
    }
    setUploadingLogoRight(false);
  }

  async function uploadLogoRight2(file: File) {
    setUploadingLogoRight2(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "logos");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (data.url) {
      setLogoRight2Url(data.url);
    } else {
      setError(data.error ?? "No se pudo subir el logo. Inténtalo de nuevo.");
    }
    setUploadingLogoRight2(false);
  }

  async function uploadPrograma(file: File) {
    setUploadingPrograma(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "programas");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (data.url) {
      setProgramaUrl(data.url);
      setCtaButtons((prev) => {
        const alreadyHas = prev.some((b) => b.url === data.url);
        if (alreadyHas) return prev;
        return [...prev, { id: uid(), text: "Ver programa", url: data.url, color: headerColor }];
      });
    } else {
      setError(data.error ?? "No se pudo subir el PDF. Inténtalo de nuevo.");
    }
    setUploadingPrograma(false);
  }

  function addCta() {
    setCtaButtons((prev) => [...prev, { id: uid(), text: "Ver más", url: "https://", color: headerColor }]);
  }

  function updateCta(id: string, field: keyof CtaButton, value: string) {
    setCtaButtons((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
  }

  function removeCta(id: string) {
    setCtaButtons((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleSave() {
    setError("");
    if (!empresaId) { setError("Debes seleccionar una empresa"); return; }
    if (!emailTitle) { setError("El título del email es obligatorio"); return; }
    setSaving(true);
    const htmlBody = buildEmailHtml(builderFields);
    const payload = {
      empresaId, subject: emailTitle, htmlBody,
      logoUrl, logoAlt, logoHeight, logoAlign, logoRightUrl, logoRightHeight, logoRight2Url, logoRight2Height, headerColor,
      emailTitle, emailSubtitle, emailDate, emailLocation, eventInfoButtons,
      iconDate, iconLinkText, iconLinkUrl,
      emailBody, ctaButtons, footerText, useAlemanaFooter, programaUrl,
    };
    try {
      const url = editId ? `/api/campanas/${editId}` : "/api/campanas";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); setSaving(false); return; }
      router.push(`/admin/campanas/${editId ?? data.id}`);
    } catch {
      setError("Error al guardar");
      setSaving(false);
    }
  }

  const tabCls = (t: Tab) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t ? "bg-[#207029] text-white" : "text-gray-500 hover:text-gray-800"}`;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Topbar */}
      <div className="border-b bg-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href={editId ? `/admin/campanas/${editId}` : "/admin/campanas"} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{editId ? "Editar campaña" : "Nueva campaña"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showPreview ? "Ocultar" : "Preview"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#207029] hover:bg-[#005f12] text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700 font-medium shrink-0">{error}</div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r bg-white overflow-y-auto flex flex-col shrink-0">

          {/* Empresa + asunto */}
          <div className="p-4 border-b space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Empresa *</Label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                disabled={!!editId}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#207029] disabled:opacity-60"
              >
                <option value="">Seleccionar empresa...</option>
                {empresas.map((em) => <option key={em.id} value={em.id}>{em.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Título del email *</Label>
              <Input placeholder="Ej: Congreso de Medicina 2026" value={emailTitle} onChange={(e) => setEmailTitle(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Bajada / subtítulo</Label>
              <Input placeholder="Ej: Lo invitamos a participar" value={emailSubtitle} onChange={(e) => setEmailSubtitle(e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3 pb-2 flex gap-1 border-b">
            <button className={tabCls("diseno")} onClick={() => setTab("diseno")}>
              <div className="flex items-center gap-1"><Palette className="w-3 h-3" /> Diseño</div>
            </button>
            <button className={tabCls("contenido")} onClick={() => setTab("contenido")}>
              <div className="flex items-center gap-1"><Layout className="w-3 h-3" /> Contenido</div>
            </button>
            <button className={tabCls("footer")} onClick={() => setTab("footer")}>
              <div className="flex items-center gap-1"><AlignCenter className="w-3 h-3" /> Footer</div>
            </button>
          </div>

          {/* ── Tab: Diseño ── */}
          {tab === "diseno" && (
            <div className="p-4 space-y-5 flex-1">
              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Logo (header y footer)</Label>
                <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
                <div className="relative group rounded-lg overflow-hidden border">
                  <img src={logoUrl} alt={logoAlt} className="w-full h-20 object-contain bg-gray-100 p-2" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                      className="text-white text-xs bg-white/20 px-3 py-1.5 rounded flex items-center gap-1.5">
                      <Upload className="w-3 h-3" /> {uploadingLogo ? "Subiendo..." : "Cambiar logo"}
                    </button>
                  </div>
                </div>
                <Input placeholder="Texto alternativo del logo" value={logoAlt} onChange={(e) => setLogoAlt(e.target.value)} className="text-sm" />
                <div className="flex gap-1">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button key={a} onClick={() => setLogoAlign(a)}
                      className={`flex-1 py-1.5 text-xs rounded border transition-colors ${logoAlign === a ? "bg-[#207029] text-white border-[#207029]" : "border-gray-200 text-gray-500 hover:border-[#207029]"}`}>
                      {a === "left" ? "↤ Izq" : a === "center" ? "↔ Centro" : "Der ↦"}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Altura del logo</label>
                    <span className="text-xs font-mono text-[#207029]">{logoHeight}</span>
                  </div>
                  <input type="range" min={24} max={120} step={4} value={parseInt(logoHeight)}
                    onChange={(e) => setLogoHeight(`${e.target.value}px`)} className="w-full accent-[#207029]" />
                  <div className="flex justify-between text-xs text-gray-300"><span>24px</span><span>120px</span></div>
                </div>
              </div>

              {/* Logo derecho */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Logo derecho 1 (header)</Label>
                <input ref={logoRightFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogoRight(f); e.target.value = ""; }} />
                <div className="relative group rounded-lg overflow-hidden border">
                  <img src={logoRightUrl} alt="Logo derecho" className="w-full h-20 object-contain bg-gray-100 p-2" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <button onClick={() => logoRightFileRef.current?.click()} disabled={uploadingLogoRight}
                      className="text-white text-xs bg-white/20 px-3 py-1.5 rounded flex items-center gap-1.5">
                      <Upload className="w-3 h-3" /> {uploadingLogoRight ? "Subiendo..." : "Cambiar logo"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Altura</label>
                    <span className="text-xs font-mono text-[#207029]">{logoRightHeight}</span>
                  </div>
                  <input type="range" min={24} max={120} step={4} value={parseInt(logoRightHeight)}
                    onChange={(e) => setLogoRightHeight(`${e.target.value}px`)} className="w-full accent-[#207029]" />
                  <div className="flex justify-between text-xs text-gray-300"><span>24px</span><span>120px</span></div>
                </div>
              </div>

              {/* Logo derecho 2 (opcional) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Logo derecho 2 (opcional)</Label>
                <input ref={logoRight2FileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogoRight2(f); e.target.value = ""; }} />
                {logoRight2Url ? (
                  <>
                    <div className="relative group rounded-lg overflow-hidden border">
                      <img src={logoRight2Url} alt="Logo derecho 2" className="w-full h-20 object-contain bg-gray-100 p-2" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition">
                        <button onClick={() => logoRight2FileRef.current?.click()} disabled={uploadingLogoRight2}
                          className="text-white text-xs bg-white/20 px-3 py-1.5 rounded flex items-center gap-1.5">
                          <Upload className="w-3 h-3" /> {uploadingLogoRight2 ? "Subiendo..." : "Cambiar"}
                        </button>
                        <button onClick={() => setLogoRight2Url("")}
                          className="text-white text-xs bg-red-500/70 px-3 py-1.5 rounded">Quitar</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400">Altura</label>
                        <span className="text-xs font-mono text-[#207029]">{logoRight2Height}</span>
                      </div>
                      <input type="range" min={24} max={120} step={4} value={parseInt(logoRight2Height)}
                        onChange={(e) => setLogoRight2Height(`${e.target.value}px`)} className="w-full accent-[#207029]" />
                      <div className="flex justify-between text-xs text-gray-300"><span>24px</span><span>120px</span></div>
                    </div>
                  </>
                ) : (
                  <button onClick={() => logoRight2FileRef.current?.click()} disabled={uploadingLogoRight2}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-400 hover:border-[#207029] hover:text-[#207029] flex flex-col items-center gap-1.5 transition">
                    <Upload className="w-5 h-5" />
                    {uploadingLogoRight2 ? "Subiendo..." : "Subir segundo logo derecho"}
                  </button>
                )}
              </div>

              {/* Color de marca / botones (el header siempre es blanco) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Color de botones (marca)</Label>
                <div className="flex flex-wrap gap-2">
                  {HEADER_COLORS.map((c) => (
                    <button key={c} onClick={() => setHeaderColor(c)} style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${headerColor === c ? "border-gray-800 scale-110" : "border-transparent"}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
                  <Input value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="text-sm flex-1" placeholder="#207029" />
                </div>
              </div>

              {/* Fecha y lugar del envío */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Fecha y lugar del envío</Label>
                <Input placeholder="Fecha (ej: 15 de junio, 9:00 hrs)" value={emailDate} onChange={(e) => setEmailDate(e.target.value)} className="text-sm" />
                <Input placeholder="Lugar" value={emailLocation} onChange={(e) => setEmailLocation(e.target.value)} className="text-sm" />
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer pt-1">
                  <input type="checkbox" checked={eventInfoButtons} onChange={(e) => setEventInfoButtons(e.target.checked)} className="accent-[#207029]" />
                  Mostrar fecha y lugar como botones redondos (ícono 📅 / 📍)
                </label>
              </div>

              {/* Iconos circulares (fecha + documento) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Iconos (fecha + documento)</Label>
                <p className="text-xs text-gray-400">Se muestran como círculos en el color de la marca, sobre el cuerpo del email. Quedan vacíos en campañas que no los usen.</p>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">📅 Fecha (texto)</label>
                  <Input placeholder="Ej: Jueves 10 de julio, 9:00 hrs" value={iconDate} onChange={(e) => setIconDate(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">📄 Documento — texto del link</label>
                  <Input placeholder="Ej: Revisa el programa" value={iconLinkText} onChange={(e) => setIconLinkText(e.target.value)} className="text-sm" />
                  <Input placeholder="URL (https://...)" value={iconLinkUrl} onChange={(e) => setIconLinkUrl(e.target.value)} className="text-sm" />
                </div>
              </div>

              {/* Programa PDF */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Programa (PDF)</Label>
                <input ref={programaFileRef} type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPrograma(f); e.target.value = ""; }} />
                {programaUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <div className="text-red-500 shrink-0">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h5v1.5H8V16z"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">PDF cargado</p>
                      <a href={programaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#207029] hover:underline">Ver PDF →</a>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => programaFileRef.current?.click()} className="text-xs text-gray-500 px-2 py-1 rounded border border-gray-200 hover:border-gray-300">Cambiar</button>
                      <button onClick={() => setProgramaUrl("")} className="text-xs text-red-500 px-2 py-1 rounded border border-red-200 hover:border-red-300">Quitar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => programaFileRef.current?.click()} disabled={uploadingPrograma}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-400 hover:border-[#207029] hover:text-[#207029] flex flex-col items-center gap-1.5 transition">
                    <Upload className="w-5 h-5" />
                    {uploadingPrograma ? "Subiendo PDF..." : "Subir programa (PDF)"}
                    <span className="text-xs text-gray-300">Máx. 20MB</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Contenido ── */}
          {tab === "contenido" && (
            <div className="p-4 space-y-4 flex-1">
              {/* Cuerpo del texto */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Cuerpo del mensaje</Label>
                <RichTextEditor
                  value={emailBody}
                  onChange={setEmailBody}
                  placeholder="Escribí el contenido principal del email..."
                />
              </div>

              {/* Botones CTA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Botones CTA</Label>
                  <button onClick={addCta} className="flex items-center gap-1 text-xs text-[#207029] hover:underline">
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>

                {ctaButtons.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                    Sin botones. Agregá uno o subí un programa PDF.
                  </p>
                )}

                {ctaButtons.map((btn) => (
                  <div key={btn.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Botón</span>
                      <button onClick={() => removeCta(btn.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input
                      placeholder="Texto del botón"
                      value={btn.text}
                      onChange={(e) => updateCta(btn.id, "text", e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="URL (https://...)"
                      value={btn.url}
                      onChange={(e) => updateCta(btn.id, "url", e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400">Color</label>
                      <input type="color" value={btn.color} onChange={(e) => updateCta(btn.id, "color", e.target.value)} className="w-7 h-7 rounded cursor-pointer border" />
                      <Input value={btn.color} onChange={(e) => updateCta(btn.id, "color", e.target.value)} className="text-sm flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Footer ── */}
          {tab === "footer" && (
            <div className="p-4 flex-1">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Texto del footer</Label>
                <Textarea
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                  placeholder="Grillo Mailing — correo.grillo.click"
                />
                <p className="text-xs text-gray-400">Dirección, teléfono, redes sociales, etc.</p>
              </div>
              <div className="space-y-2 mt-6 pt-4 border-t border-gray-100">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Footer corporativo</Label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={useAlemanaFooter} onChange={(e) => setUseAlemanaFooter(e.target.checked)} className="accent-[#207029]" />
                  Agregar footer de Grillo (logo y link de baja) sobre el footer actual
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="flex-1 bg-gray-100 overflow-auto flex flex-col">
            <div className="px-4 py-2 bg-white border-b flex items-center gap-2 text-sm text-gray-500 shrink-0">
              <Eye className="w-4 h-4 text-[#207029]" /> Preview en vivo
            </div>
            <div className="flex-1 flex items-start justify-center p-6">
              <iframe
                srcDoc={previewHtml}
                className="w-full max-w-2xl shadow-lg rounded-lg bg-white"
                style={{ height: "calc(100vh - 110px)", border: "none" }}
                title="Preview email"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NuevaCampanaPage() {
  return <Suspense><EmailBuilderForm /></Suspense>;
}
