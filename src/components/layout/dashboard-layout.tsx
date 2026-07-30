"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { GrilloWordmarkBold } from "@/components/brand/wordmark"
import { ThemeToggle } from "@/components/brand/theme-toggle"
import {
  LayoutDashboard,
  Building2,
  Globe,
  FileText,
  Send,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Organizaciones", href: "/dashboard/organizations", icon: Building2, adminOnly: true },
  { name: "Dominios", href: "/dashboard/domains", icon: Globe },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Campañas", href: "/dashboard/campaigns", icon: Send },
  { name: "Contactos", href: "/dashboard/contacts", icon: Users },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname()

  const filteredNav = navigation.filter(
    (item) => !item.adminOnly || user.role === "ADMIN"
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-72 bg-background-sunken border-r border-border flex flex-col flex-shrink-0 p-6">
          <div className="px-2 pt-2 mb-8 flex-shrink-0">
            <Link href="/dashboard" className="flex flex-col">
              <GrilloWordmarkBold size={30} color="var(--text)" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.16em] leading-none mt-2 ml-11 opacity-90">
                Mailing
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar min-h-0 -mx-2 px-2">
            {filteredNav.map((item) => {
              // "/dashboard" solo se marca activo en coincidencia exacta: con
              // startsWith quedaba encendido en todas las subrutas a la vez.
              const isActive =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[14.5px] font-medium leading-none transition-all group/item ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                      : "text-foreground hover:bg-background-muted"
                  }`}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-foreground group-hover/item:text-primary transition-colors"
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3 pt-6 flex-shrink-0 border-t border-border">
            {/* Apariencia */}
            <div className="flex items-center justify-between bg-background-elev border border-border rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold text-foreground-subtle tracking-widest uppercase ml-1">
                Apariencia
              </span>
              <ThemeToggle />
            </div>

            {/* Usuario */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-background-elev border border-border rounded-2xl shadow-sm">
              <Avatar className="w-9 h-9 shrink-0 border border-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{user.name || user.email}</p>
                <p className="text-[11px] text-foreground-muted truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-3 w-full px-4 py-3 text-danger/80 hover:text-danger hover:bg-danger/5 rounded-xl transition-all text-[14px] font-bold group/logout"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0 transition-transform group-hover/logout:translate-x-0.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-10 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
