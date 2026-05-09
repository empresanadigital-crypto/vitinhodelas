import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Smartphone, Users, Send, BarChart3, LogOut, Bell, Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/instancias", icon: Smartphone, label: "Instâncias" },
  { to: "/contatos", icon: Users, label: "Contatos" },
  { to: "/campanhas", icon: Send, label: "Campanhas" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
];

const AppSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, signOut } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";
  const emailHandle = user?.email?.split("@")[0] || "Usuário";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col gap-5 overflow-y-auto border-r-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-[22px_18px]">
      {/* Logo + ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/readyzap-logo.png"
            alt="ReadyZap"
            className="block h-[38px] w-[38px] rounded-[9px] border-[1.5px] border-[var(--border-strong)]"
          />
          <div className="flex flex-col leading-none">
            <span className="text-[17px] font-bold text-[var(--text)] tracking-tight">ReadyZap</span>
            <span className="mt-[3px] text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">SENDER</span>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          title={isDark ? "Tema claro" : "Tema escuro"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] transition-all hover:bg-[var(--text)] hover:text-[var(--surface)]"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Workspace card */}
      <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)] p-3 shadow-[var(--shadow-sm)]">
        <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] text-xs font-bold text-[#1D1D1B]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-[var(--text)]">{emailHandle}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">Plano Business</div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-[3px]">
        <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Menu
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              [
                "flex items-center gap-2.5 rounded-[10px] border-[1.5px] px-3 py-2.5 text-[14px] transition-all",
                isActive
                  ? "border-[var(--border-strong)] bg-[var(--surface)] font-bold text-[var(--text)] shadow-[var(--shadow-sm)]"
                  : "border-transparent font-medium text-[var(--text)] hover:bg-[var(--pastel-gray)]",
              ].join(" ")
            }
          >
            <Icon className="h-[17px] w-[17px] flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium text-[var(--text-muted)] transition-all hover:bg-[var(--pastel-gray)] hover:text-[var(--text)]"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
