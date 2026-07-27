"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowRight, Shield } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Email o contraseña incorrectos")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a1a] flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Grillo</span>
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight">
            Tu contenido aprobado,<br />
            sin idas y vueltas.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-md">
            La plataforma de emailing pensada para agencias que quieren enviar campañas como pros — sin Excel, sin un millón de herramientas.
          </p>
          <div className="flex items-center gap-3 text-sm text-white/40">
            <Shield className="w-4 h-4" />
            <span>Seguridad bancaria. Encriptación de punta.</span>
          </div>
        </div>
        <div className="text-sm text-white/30">
          © 2026 Grillo. Derechos reservados.
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Grillo Mailing</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">
              Bienvenido de vuelta
            </h1>
            <p className="text-[#737373] text-base">
              Ingresa tus credenciales para acceder a la plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#1a1a1a]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@grillo.click"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-[#e5e5e5] bg-white focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10 rounded-xl text-base transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#1a1a1a]">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-[#e5e5e5] bg-white focus:border-[#1a1a1a] focus:ring-[#1a1a1a]/10 rounded-xl text-base transition-all"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-[#1a1a1a] hover:bg-[#333333] text-white rounded-xl text-base font-medium transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Ingresar
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-[#e5e5e5]">
            <p className="text-xs text-[#a3a3a3] text-center">
              Admin por defecto: <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded text-[#525252]">admin@grillo.click</code> / <code className="bg-[#f5f5f5] px-1.5 py-0.5 rounded text-[#525252]">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
