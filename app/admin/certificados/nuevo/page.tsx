"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";

interface Row {
  recipientName: string;
  recipientEmail: string;
  role: string;
  horas: number;
  activityTitle: string;
  activityDate: string;
  valid: boolean;
}

export default function NuevoCertificadoPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/certificados/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al leer el archivo");
      setRows(data.rows);
      setName(data.suggestedName ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer el archivo");
      setRows([]);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/certificados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rows: rows.filter((r) => r.valid) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el lote");
      router.push(`/admin/certificados/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el lote");
      setCreating(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/certificados">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo lote de certificados</h1>
      </div>

      <Card>
        <CardContent className="py-6 space-y-4">
          <div>
            <Label>Archivo CSV o Excel</Label>
            <p className="text-sm text-gray-500 mb-2">
              Columnas esperadas: nombre receptor, email, categoría de participación, horas académicas, título de la actividad y fecha.
            </p>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#207029] transition-colors w-fit">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
              <span className="text-sm text-gray-600">{fileName || "Seleccionar archivo…"}</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[240px]">
                <Label htmlFor="batch-name">Nombre del lote</Label>
                <Input id="batch-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-emerald-700">{validCount} válidos</span>
                {invalidCount > 0 && (
                  <span className="ml-2 text-amber-700 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} sin email válido (se omiten)
                  </span>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2 font-medium">Nombre</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Rol</th>
                      <th className="px-3 py-2 font-medium">Horas</th>
                      <th className="px-3 py-2 font-medium">Actividad</th>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-t ${r.valid ? "" : "bg-amber-50"}`}>
                        <td className="px-3 py-2 text-gray-900">{r.recipientName}</td>
                        <td className={`px-3 py-2 ${r.valid ? "text-gray-600" : "text-amber-700"}`}>
                          {r.recipientEmail || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{r.role}</td>
                        <td className="px-3 py-2 text-gray-600">{r.horas}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate">{r.activityTitle}</td>
                        <td className="px-3 py-2 text-gray-600">{r.activityDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreate}
                disabled={creating || validCount === 0}
                className="bg-[#207029] hover:bg-[#005f12] text-white"
              >
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear lote ({validCount})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
