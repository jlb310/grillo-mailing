"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";

interface ContactGroup {
  id: string;
  name: string;
  _count: { contacts: number };
}

interface GruposPanelProps {
  eventId: string;
  groups: ContactGroup[];
  totalContacts: number;
  ungroupedCount: number;
}

export default function GruposPanel({ eventId, groups, totalContacts, ungroupedCount }: GruposPanelProps) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function crearGrupo() {
    if (!nuevoNombre.trim()) return;
    setSaving(true);
    await fetch(`/api/eventos/${eventId}/grupos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nuevoNombre.trim() }),
    });
    setSaving(false);
    setNuevoNombre("");
    setCreando(false);
    router.refresh();
  }

  async function eliminarGrupo(groupId: string) {
    if (!confirm("¿Eliminar este grupo? Los contactos no se borran.")) return;
    await fetch(`/api/eventos/${eventId}/grupos/${groupId}`, { method: "DELETE" });
    router.refresh();
  }

  async function importarCSV(groupId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/eventos/${eventId}/grupos/${groupId}/contactos`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    alert(
      `Importados: ${data.imported} contactos` +
        (data.invalid ? ` · ${data.invalid} inválidos descartados` : "")
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{totalContacts} contactos en total</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setCreando(true)}
        >
          <Plus className="w-3 h-3 mr-1" /> Nuevo grupo
        </Button>
      </div>

      {creando && (
        <div className="flex gap-2">
          <input
            autoFocus
            className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#207029]"
            placeholder="Nombre del grupo"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") crearGrupo();
              if (e.key === "Escape") { setCreando(false); setNuevoNombre(""); }
            }}
          />
          <Button size="sm" className="h-7 text-xs bg-[#207029] hover:bg-[#005f12] text-white" onClick={crearGrupo} disabled={saving}>
            Crear
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setCreando(false); setNuevoNombre(""); }}>
            Cancelar
          </Button>
        </div>
      )}

      {groups.length === 0 && !creando && (
        <p className="text-sm text-gray-400 py-2 text-center">Sin grupos. Creá uno para organizar los envíos.</p>
      )}

      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
              <div className="flex items-center gap-2">
                {expanded === g.id ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                <Users className="w-3.5 h-3.5 text-[#207029]" />
                <span className="text-sm font-medium text-gray-800">{g.name}</span>
                <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full border">
                  {g._count.contacts}
                </span>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  ref={(el) => { fileRefs.current[g.id] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importarCSV(g.id, file);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-gray-600"
                  onClick={() => fileRefs.current[g.id]?.click()}
                >
                  <Upload className="w-3 h-3 mr-1" /> CSV
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-gray-400 hover:text-red-500"
                  onClick={() => eliminarGrupo(g.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ungroupedCount > 0 && (
        <div className="flex items-center justify-between pt-1 px-1">
          <span className="text-xs text-gray-400">
            {ungroupedCount} contacto{ungroupedCount !== 1 ? "s" : ""} sin grupo
          </span>
          <button
            className="text-xs text-red-400 hover:text-red-600 underline"
            onClick={async () => {
              if (!confirm(`¿Eliminar los ${ungroupedCount} contactos sin grupo? Esta acción no se puede deshacer.`)) return;
              const res = await fetch(`/api/eventos/${eventId}/contactos`, { method: "DELETE" });
              const data = await res.json();
              alert(`${data.deleted} contactos eliminados.`);
              router.refresh();
            }}
          >
            Borrar sin grupo
          </button>
        </div>
      )}
    </div>
  );
}
