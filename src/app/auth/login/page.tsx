"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Shield } from "lucide-react"
import { GrilloWordmark, GrilloWordmarkBold } from "@/components/brand/wordmark"

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
      <div className="hidden lg:flex lg:w-1/2 bg-forest flex-col justify-between p-12 text-white">
        <GrilloWordmark size={30} color="#ffffff" variant="onDark" />
        <div className="space-y-6">
          <h2 className="text-5xl leading-[1.1]">
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
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <GrilloWordmarkBold size={24} color="var(--text)" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl text-foreground">
              Bienvenido de vuelta
            </h1>
            <p className="text-foreground-muted text-base">
              Ingresa tus credenciales para acceder a la plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@grillo.click"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-border bg-background-sunken focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-border bg-background-sunken focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-base transition-all"
              />
            </div>
            {error && (
              <p className="text-sm text-danger bg-danger/5 border border-danger/10 px-4 py-3 rounded-xl">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
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

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-foreground-subtle text-center">
              ¿Problemas para entrar? Escribinos a{" "}
              <a
                href="mailto:soporte@grillo.click"
                className="text-primary font-medium underline underline-offset-2 hover:text-primary-hover transition-colors"
              >
                soporte@grillo.click
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
