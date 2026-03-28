import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Send,
  BarChart3,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/instancias", icon: Smartphone, label: "Instâncias" },
  { to: "/contatos", icon: Users, label: "Contatos" },
  { to: "/campanhas", icon: Send, label: "Campanhas" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-foreground">ReadyZap</span>
          <span className="ml-1 text-xs text-primary font-semibold">Sender</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "text-[#60a5fa] border-l-2 border-[#3b82f6]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              style={isActive ? { backgroundColor: 'rgba(59,130,246,0.10)' } : undefined}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-[#60a5fa]" : ""}`} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-3">
        <div className="text-xs text-muted-foreground truncate px-1">
          {user?.email}
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
