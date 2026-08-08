"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function UploadContactosButton({ empresaId }: { empresaId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/empresas/${empresaId}/contactos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        const parts = [`${data.imported} contactos importados`];
        if (data.duplicates) parts.push(`${data.duplicates} duplicados omitidos`);
        if (data.invalid) parts.push(`${data.invalid} inválidos descartados`);
        alert(parts.join(" · "));
        router.refresh();
      } else {
        alert(data.error ?? "Error al importar");
      }
    } catch {
      alert("Error al importar: no se pudo conectar con el servidor.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-3 h-3 mr-1" />
        {uploading ? "Subiendo..." : "CSV / Excel"}
      </Button>
    </>
  );
}
