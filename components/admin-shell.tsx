"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";

interface AdminShellProps {
  role: string;
  empresaName: string | null;
  userName: string;
  children: React.ReactNode;
}

export function AdminShell({ role, empresaName, userName, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("grillo_nav_collapsed") === "1";
    } catch { return false; }
  });

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("grillo_nav_collapsed", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!collapsed && <AdminNav role={role} empresaName={empresaName} userName={userName} />}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex items-center h-12 px-3 border-b border-gray-100 bg-white">
          <button
            onClick={toggle}
            aria-label={collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
            title={collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
