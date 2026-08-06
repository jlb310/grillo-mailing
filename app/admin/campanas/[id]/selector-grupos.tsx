"use client";

import { useState, useEffect } from "react";
import { Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactGroup {
  id: string;
  name: string;
  _count: { contacts: number };
}

interface SelectorGruposProps {
  campaignId: string;
  eventId: string;
  disabled?: boolean;
  onGroupsChange?: (groupIds: string[]) => void;
}

export default function SelectorGrupos({ campaignId, eventId, disabled, onGroupsChange }: SelectorGruposProps) {
  const [availableGroups, setAvailableGroups] = useState<ContactGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/eventos/${eventId}/grupos`).then((r) => r.json()),
      fetch(`/api/campanas/${campaignId}/grupos`).then((r) => r.json()),
    ]).then(([all, assigned]) => {
      setAvailableGroups(all);
      setSelectedIds((assigned as ContactGroup[]).map((g) => g.id));
    });
  }, [campaignId, eventId]);

  function toggle(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setSaved(false);
  }

  async function guardar() {
    setSaving(true);
    await fetch(`/api/campanas/${campaignId}/grupos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds: selectedIds }),
    });
    setSaving(false);
    setSaved(true);
    onGroupsChange?.(selectedIds);
  }

  if (availableGroups.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No hay grupos en este evento.{" "}
        <a href={`/admin/eventos/${eventId}`} className="text-[#207029] hover:underline">
          Crear grupos →
        </a>
      </p>
    );
  }

  const totalSelected = availableGroups
    .filter((g) => selectedIds.includes(g.id))
    .reduce((acc, g) => acc + g._count.contacts, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableGroups.map((g) => {
          const active = selectedIds.includes(g.id);
          return (
            <button
              key={g.id}
              disabled={disabled}
              onClick={() => toggle(g.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? "bg-[#207029] text-white border-[#207029]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#207029] hover:text-[#207029]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {active && <Check className="w-3 h-3" />}
              <Users className="w-3 h-3" />
              <span>{g.name}</span>
              <span className={`text-xs ${active ? "text-teal-100" : "text-gray-400"}`}>
                ({g._count.contacts})
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {selectedIds.length === 0
            ? "Sin grupos seleccionados → se envía a todos los contactos del evento"
            : `${selectedIds.length} grupo${selectedIds.length !== 1 ? "s" : ""} · ${totalSelected} contacto${totalSelected !== 1 ? "s" : ""}`}
        </p>
        <Button
          size="sm"
          className="h-7 text-xs bg-[#207029] hover:bg-[#005f12] text-white"
          onClick={guardar}
          disabled={saving || disabled}
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
