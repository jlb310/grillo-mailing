"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { LayoutDashboard, Mail, LogOut, ChevronRight, BarChart2, Building2, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrilloMark } from "@/components/grillo-logo";

interface AdminNavProps {
  role: string;
  empresaName: string | null;
  userName: string;
}

const primary = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/campanas", label: "Campañas", icon: Mail },
  { href: "/admin/metricas", label: "Métricas", icon: BarChart2 },
];

interface Empresa {
  id: string;
  name: string;
}

function NavItem({ href, label, icon: Icon, pathname }: {
  href: string; label: string; icon: React.ElementType; pathname: string;
}) {
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
        active
          ? "bg-[#69bc57]/10 text-gray-900 font-medium"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-normal"
      )}
    >
      <Icon className={cn("w-[17px] h-[17px] flex-shrink-0", active ? "text-[#4a9e3b]" : "text-gray-400 group-hover:text-gray-600")} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="w-3 h-3 text-gray-400" />}
    </Link>
  );
}

export function AdminNav({ role, empresaName, userName }: AdminNavProps) {
  const pathname = usePathname();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, setActiveEmpresa] = useState<string>(() =>
    typeof window !== "undefined"
      ? document.cookie
          .split("; ")
          .find((c) => c.startsWith("grillo_empresa_id="))
          ?.split("=")[1] ?? ""
      : ""
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/empresas").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setEmpresas(d);
    });
  }, [isSuperAdmin]);

  function switchEmpresa(id: string) {
    setActiveEmpresa(id);
    document.cookie = `grillo_empresa_id=${id}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  const secondary = isSuperAdmin
    ? [{ href: "/admin/empresas", label: "Empresas", icon: Building2 }]
    : [];

  return (
    <aside className="w-56 min-h-screen flex flex-col flex-shrink-0 bg-white border-r border-gray-200 text-gray-900">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-[7px] px-1 text-gray-900">
          <GrilloMark size={26} />
          <div className="leading-tight">
            <p className="font-bold text-[15px] tracking-[-0.03em]">Grillo</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a9e3b]">Mailing</p>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {primary.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}

        {secondary.length > 0 && (
          <>
            {/* Divider */}
            <div className="pt-4 pb-1">
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest px-3">
                Configuración
              </p>
            </div>
            {secondary.map((item) => (
              <NavItem key={item.href} {...item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Empresa switcher */}
      <div className="px-3 py-3 border-t border-gray-100">
        {isSuperAdmin ? (
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest px-3">Empresa</p>
            <div className="relative">
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={activeEmpresa}
                onChange={(e) => switchEmpresa(e.target.value)}
                className="w-full appearance-none bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-xl pl-8 pr-3 py-2 border-0 focus:outline-none focus:ring-1 focus:ring-[#69bc57] cursor-pointer"
              >
                <option value="" className="bg-white">Todas las empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id} className="bg-white">{e.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3">
            <Building2 className="w-4 h-4 text-[#4a9e3b]" />
            <span className="text-sm text-gray-600 font-medium truncate">{empresaName ?? "Mi empresa"}</span>
          </div>
        )}
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t border-gray-100">
        <div className="px-3 py-1.5 text-xs text-gray-400 truncate">{userName}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
