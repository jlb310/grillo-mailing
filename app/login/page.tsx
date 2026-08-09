"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GrilloMark } from "@/components/grillo-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.ok) {
      router.push("/admin");
    } else {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#fafbf5" }}>
      {/* Left panel — dark estilo grillo.click */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 text-[#f8f9f5]" style={{ background: "#070d08" }}>
        <div className="flex items-center gap-[7px] text-[#f8f9f5]">
          <GrilloMark size={30} />
          <span className="font-bold text-xl tracking-[-0.03em] leading-none">Grillo</span>
        </div>
        <div>
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#69bc57]/10 border border-[#69bc57]/20 text-[#89dd76] text-[11px] font-bold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#69bc57] animate-pulse"></span>
            Grillo Mailing
          </div>
          <h2 className="font-serif text-5xl leading-[0.95] tracking-tight mb-6">
            Tus campañas de email,<br />
            <em className="italic text-[#69bc57]">sin idas y vueltas.</em>
          </h2>
          <p className="text-[#8a9288] text-sm leading-relaxed max-w-md">
            Gestión de campañas y contactos — todo desde un solo lugar.
          </p>
        </div>
        <p className="text-[#8a9288]/40 text-xs">© 2026 Grillo</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-[7px] text-[#020802]">
            <GrilloMark size={28} />
            <span className="font-bold text-lg tracking-[-0.03em] leading-none">Grillo</span>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
            <p className="text-gray-500 text-sm mt-1">Ingresá con tus credenciales de administrador</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@grillo.click"
                className="h-11 rounded-xl border-gray-200 bg-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-gray-200 bg-white"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-bold text-sm text-[#fafbf5] transition-colors disabled:opacity-60 hover:bg-[#005f12]"
              style={{ background: "#207029" }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
