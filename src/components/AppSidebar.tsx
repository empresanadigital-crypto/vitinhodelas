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
  Flame,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const navGroups = [
  {
    label: "Menu",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/instancias", icon: Smartphone, label: "Instâncias" },
      { to: "/contatos", icon: Users, label: "Contatos" },
      { to: "/campanhas", icon: Send, label: "Campanhas" },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/configuracoes", icon: Settings, label: "Configurações" },
    ],
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [exitHover, setExitHover] = useState(false);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 40,
        width: 220,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0d0d11",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 18px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(59,130,246,0.25)",
          }}
        >
          <Zap style={{ width: 13, height: 13, color: "#fff" }} />
        </div>
        <span
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#f2f2ff",
          }}
        >
          ReadyZap
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase" as const,
                color: "rgba(242,242,255,0.10)",
                padding: "0 8px",
                margin: "14px 0 5px",
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: isActive ? "9px 10px 9px 8px" : "9px 10px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#f2f2ff" : "rgba(242,242,255,0.22)",
                    textDecoration: "none",
                    cursor: "pointer",
                    marginBottom: 1,
                    transition: "background .12s, color .12s",
                    background: isActive ? "rgba(59,130,246,0.10)" : "transparent",
                    borderLeft: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "rgba(242,242,255,0.50)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(242,242,255,0.22)";
                    }
                  }}
                >
                  <item.icon
                    style={{
                      width: 15,
                      height: 15,
                      flexShrink: 0,
                      color: isActive ? "#60a5fa" : undefined,
                    }}
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "14px 12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* User row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 8px",
            borderRadius: 8,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(59,130,246,0.10)",
              border: "1px solid rgba(59,130,246,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#60a5fa",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#f2f2ff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email?.split("@")[0] || "Usuário"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(242,242,255,0.22)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email || ""}
            </div>
          </div>
        </div>

        {/* Sair */}
        <div
          onClick={signOut}
          onMouseEnter={() => setExitHover(true)}
          onMouseLeave={() => setExitHover(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px",
            borderRadius: 7,
            fontSize: 12,
            color: exitHover ? "#ef4444" : "rgba(242,242,255,0.22)",
            background: exitHover ? "rgba(239,68,68,0.06)" : "transparent",
            cursor: "pointer",
            transition: "all .12s",
          }}
        >
          <LogOut style={{ width: 14, height: 14 }} />
          Sair
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
