import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Send,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";

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

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-green">
          <Zap className="h-5 w-5 text-primary-foreground" />
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
                  ? "bg-primary/10 text-primary glow-green"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="glass-card rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Instâncias ativas</p>
          <p className="text-2xl font-bold text-primary">0</p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
