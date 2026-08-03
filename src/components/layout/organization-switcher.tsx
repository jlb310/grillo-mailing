"use client"

import { useEffect, useState } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { Building2 } from "lucide-react"

interface Org {
  id: string
  name: string
  slug: string
}

export function OrganizationSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [activeOrg, setActiveOrg] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrgs(data)
          // Prioridad: URL ?org= > localStorage > primera org
          const fromUrl = searchParams.get("org")
          const saved = localStorage.getItem("grillo-active-org")
          let selected = ""
          if (fromUrl && data.find((o: Org) => o.id === fromUrl)) {
            selected = fromUrl
          } else if (saved && data.find((o: Org) => o.id === saved)) {
            selected = saved
          } else if (data.length > 0) {
            selected = data[0].id
          }
          if (selected) {
            setActiveOrg(selected)
            localStorage.setItem("grillo-active-org", selected)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleChange = (id: string) => {
    setActiveOrg(id)
    localStorage.setItem("grillo-active-org", id)
    // Actualizar la URL para que los server components vean la org activa
    const params = new URLSearchParams(searchParams.toString())
    params.set("org", id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    // Recargar para que los server components actualicen sus datos
    window.location.href = `${pathname}?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-9 bg-background-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (orgs.length === 0) return null

  return (
    <div className="px-3 py-2">
      <label className="text-[10px] font-bold text-foreground-subtle tracking-widest uppercase ml-1 mb-1.5 block">
        Organización activa
      </label>
      <div className="relative">
        <Building2 className="w-3.5 h-3.5 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <select
          value={activeOrg}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-9 pl-8 pr-3 text-sm bg-background-elev border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
