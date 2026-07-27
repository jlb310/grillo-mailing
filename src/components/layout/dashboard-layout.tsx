"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Building2,
  Globe,
  FileText,
  Send,
  Users,
  BarChart3,
  LogOut,
  Mail,
  ChevronRight,
  Settings,
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
    <div className="min-h-screen bg-[#fafafa]">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#e5e5e5] flex flex-col">
          <div className="p-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#1a1a1a]">Grillo</span>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#1a1a1a] text-white shadow-sm"
                      : "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[#e5e5e5]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-9 h-9 bg-[#f5f5f5]">
                <AvatarFallback className="bg-[#f5f5f5] text-[#525252] text-xs font-medium">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a] truncate">{user.name || user.email}</p>
                <p className="text-xs text-[#a3a3a3] truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-[#737373] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-xl h-9 text-sm"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-10 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
