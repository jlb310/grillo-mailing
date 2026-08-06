"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  endpoint: string;
  confirm: string;
  redirectTo?: string;
}

export default function DeleteButton({ endpoint, confirm, redirectTo }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(confirm)) return;
    setLoading(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Error al eliminar: ${data.error ?? "intenta de nuevo"}`);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      title="Eliminar"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
