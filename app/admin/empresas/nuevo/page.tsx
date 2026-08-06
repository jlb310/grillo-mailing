"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";

export default function NuevaEmpresaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const set = (key: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSave() {
    setError("");
    if (!fields.name || !fields.slug) {
      setError("El nombre y el slug son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`Error ${res.status}: ${data.error ?? JSON.stringify(data)}`);
        setSaving(false);
        return;
      }
      router.push(`/admin/empresas/${data.id}`);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Link href="/admin/empresas" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva empresa</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Nombre *</Label>
          <Input
            placeholder="Ej: Clínica Alemana"
            value={fields.name}
            onChange={set("name")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Slug *</Label>
          <Input
            placeholder="Ej: clinica-alemana"
            value={fields.slug}
            onChange={set("slug")}
          />
          <p className="text-xs text-gray-400">
            Solo letras minúsculas, números y guiones. Único e inmutable.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Descripción breve..."
            value={fields.description}
            onChange={set("description")}
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/admin/empresas">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#207029] hover:bg-[#005f12] text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar empresa"}
        </Button>
      </div>
    </div>
  );
}
