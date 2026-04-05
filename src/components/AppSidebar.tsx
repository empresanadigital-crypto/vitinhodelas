import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Send,
  BarChart3,
  Settings,
  LogOut,
  Flame,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { Sun, Moon } from "lucide-react";

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

const AppSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, toggleTheme } = useTheme();
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
        background: "#040408",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 18px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #3b82f6, #18f26a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "block",
            lineHeight: 1.1,
          }}
        >
          ReadyZap
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "rgba(242,242,255,0.25)",
            display: "block",
            marginTop: 2,
          }}
        >
          SENDER
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
                  onClick={() => onNavigate?.()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: isActive ? "9px 10px 9px 8px" : "9px 10px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#f2f2ff" : "rgba(242,242,255,0.4)",
                    textDecoration: "none",
                    cursor: "pointer",
                    marginBottom: 1,
                    transition: "background .12s, color .12s",
                    background: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.color = "rgba(242,242,255,0.7)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(242,242,255,0.4)";
                    }
                  }}
                >
                  <item.icon
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      color: isActive ? "#60a5fa" : "rgba(242,242,255,0.4)",
                    }}
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* Admin link */}
        {isAdmin && (
          <div>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.05)",
                margin: "12px 8px 10px",
              }}
            />
            <NavLink
              to="/admin"
              onClick={() => onNavigate?.()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: location.pathname === "/admin" ? "9px 10px 9px 8px" : "9px 10px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: location.pathname === "/admin" ? 600 : 500,
                color: location.pathname === "/admin" ? "#f2f2ff" : "rgba(242,242,255,0.4)",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background .12s, color .12s",
                background: location.pathname === "/admin" ? "rgba(59,130,246,0.08)" : "transparent",
                borderLeft: location.pathname === "/admin" ? "2px solid #3b82f6" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== "/admin") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "rgba(242,242,255,0.7)";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/admin") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(242,242,255,0.4)";
                }
              }}
            >
              <ShieldCheck
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  color: location.pathname === "/admin" ? "#60a5fa" : "rgba(242,242,255,0.4)",
                }}
              />
              Admin
            </NavLink>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "14px 12px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
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
              fontFamily: "'Outfit', sans-serif",
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

        {/* ReadyZap link */}
        <div
          onClick={() => window.open("https://app.readyzap.com.br/dashboard", "_blank")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px",
            borderRadius: 7,
            fontSize: 12,
            color: "rgba(242,242,255,0.4)",
            cursor: "pointer",
            transition: "all .12s",
            marginBottom: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(251,146,60,0.08)";
            e.currentTarget.style.color = "#fb923c";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(242,242,255,0.4)";
          }}
        >
          <Flame style={{ width: 14, height: 14 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>ReadyZap</div>
            <div style={{ fontSize: 9, opacity: 0.6 }}>Aquecedor de chips</div>
          </div>
        </div>

        {/* Theme toggle */}
        <div
          onClick={toggleTheme}
          className="theme-toggle-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px",
            borderRadius: 7,
            fontSize: 12,
            color: "rgba(242,242,255,0.4)",
            cursor: "pointer",
            transition: "all .12s",
            marginBottom: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "rgba(242,242,255,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(242,242,255,0.4)";
          }}
        >
          {theme === "dark" ? <Sun style={{ width: 14, height: 14 }} /> : <Moon style={{ width: 14, height: 14 }} />}
          {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
        </div>

        {/* Sair */}
        <div
          onClick={() => { signOut(); onNavigate?.(); }}
          onMouseEnter={() => setExitHover(true)}
          onMouseLeave={() => setExitHover(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px",
            borderRadius: 7,
            fontSize: 12,
            color: exitHover ? "#ef4444" : "rgba(242,242,255,0.4)",
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
