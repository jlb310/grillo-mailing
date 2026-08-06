"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";

interface ContactRow {
  id: string;
  name: string;
  email: string;
  attended: boolean;
}

interface Props {
  eventId: string;
  contacts: ContactRow[];
}

export default function AsistenciaPanel({ eventId, contacts: initialContacts }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const attendedCount = initialContacts.filter((c) => c.attended).length;
  const total = initialContacts.length;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/eventos/${eventId}/asistencia`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      const msg =
        `${data.marked} contacto(s) marcado(s) como asistentes.` +
        (data.notFound.length > 0 ? `\nNo encontrados: ${data.notFound.join(", ")}` : "");
      alert(msg);
      router.refresh();
    } else {
      alert(data.error ?? "Error al subir asistencia");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function toggleAttended(contact: ContactRow, value: boolean) {
    setPending((prev) => ({ ...prev, [contact.id]: true }));
    await fetch(`/api/eventos/${eventId}/contactos/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended: value }),
    });
    setPending((prev) => {
      const next = { ...prev };
      delete next[contact.id];
      return next;
    });
    router.refresh();
  }

  async function markAll(value: boolean) {
    const targets = initialContacts.filter((c) => c.attended !== value);
    for (const c of targets) {
      await fetch(`/api/eventos/${eventId}/contactos/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended: value }),
      });
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Asistencia
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#daefd6", color: "#207029" }}
          >
            {attendedCount} / {total} asistieron
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAll(true)}
            disabled={total === 0}
          >
            Marcar todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAll(false)}
            disabled={total === 0}
          >
            Desmarcar todos
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            className="h-7 text-xs text-white"
            style={{ background: "#207029" }}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            {uploading ? "Subiendo..." : "CSV asistencia"}
          </Button>
        </div>
      </div>

      {/* Table */}
      {total === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Sin contactos en este evento.</p>
      ) : (
        <div className="overflow-y-auto max-h-80 border rounded-md">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr>
                <th className="w-8 px-3 py-2 text-left font-medium text-gray-500 text-xs">Asistió</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">Nombre</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">Email</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialContacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={c.attended}
                      disabled={!!pending[c.id]}
                      onChange={(e) => toggleAttended(c, e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: "#207029" }}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{c.email}</td>
                  <td className="px-3 py-2">
                    {c.attended && (
                      <a
                        href={`/api/eventos/${eventId}/diplomas/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Descargar diploma"
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100"
                        style={{ color: "#207029" }}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
