"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";

export default function NuevoEventoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    horasLectivas: "8",
    firmante: "",
    firmanteTitle: "",
  });

  const set = (key: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSave() {
    setError("");
    if (!fields.title || !fields.date) {
      setError("El título y la fecha son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          horasLectivas: Number(fields.horasLectivas) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`Error ${res.status}: ${data.error ?? JSON.stringify(data)}`);
        setSaving(false);
        return;
      }
      router.push(`/admin/eventos/${data.id}`);
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
        <Link href="/admin/eventos" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo evento</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Nombre del evento *</Label>
          <Input
            placeholder="Ej: Jornada de Medicina Interna 2026"
            value={fields.title}
            onChange={set("title")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Descripción breve del evento..."
            value={fields.description}
            onChange={set("description")}
            className="min-h-[80px] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha y hora *</Label>
            <Input
              type="datetime-local"
              value={fields.date}
              onChange={set("date")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horas lectivas</Label>
            <Input
              type="number"
              min="0"
              placeholder="8"
              value={fields.horasLectivas}
              onChange={set("horasLectivas")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Lugar</Label>
          <Input
            placeholder="Ej: Auditorio Central"
            value={fields.location}
            onChange={set("location")}
          />
        </div>

        <div className="border-t pt-4 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Diploma</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Firmante</Label>
              <Input
                placeholder="Ej: Dr. Juan Pérez"
                value={fields.firmante}
                onChange={set("firmante")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo del firmante</Label>
              <Input
                placeholder="Ej: Director de Educación Continua"
                value={fields.firmanteTitle}
                onChange={set("firmanteTitle")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/admin/eventos">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#207029] hover:bg-[#005f12] text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar evento"}
        </Button>
      </div>
    </div>
  );
}
