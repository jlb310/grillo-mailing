"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Mail, Calendar, LogOut, ChevronRight, BarChart2, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrilloMark } from "@/components/grillo-logo";

const primary = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/campanas", label: "Campañas", icon: Mail },
  { href: "/admin/certificados", label: "Certificados", icon: Award },
  { href: "/admin/metricas", label: "Métricas", icon: BarChart2 },
];

const secondary = [
  { href: "/admin/eventos", label: "Eventos", icon: Calendar },
];

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
          ? "bg-white/10 text-white font-medium"
          : "text-white/55 hover:bg-white/5 hover:text-white/90 font-normal"
      )}
    >
      <Icon className={cn("w-[17px] h-[17px] flex-shrink-0", active ? "text-[#69bc57]" : "text-white/40 group-hover:text-white/70")} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="w-3 h-3 text-white/30" />}
    </Link>
  );
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen flex flex-col flex-shrink-0 text-[#f8f9f5]" style={{ background: "#070d08" }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: "#1d271f" }}>
        <div className="flex items-center gap-[7px] px-1">
          <GrilloMark size={26} />
          <div className="leading-tight">
            <p className="font-bold text-[15px] tracking-[-0.03em]">Grillo</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#69bc57]">Mailing</p>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {primary.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}

        {/* Divider */}
        <div className="pt-4 pb-1">
          <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest px-3">
            Configuración
          </p>
        </div>

        {secondary.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: "#1d271f" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
