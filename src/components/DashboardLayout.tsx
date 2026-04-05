import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import SupportChat from "./SupportChat";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile header */}
      <div
        className="mobile-header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          zIndex: 100,
          background: "#08090e",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 16px",
          alignItems: "center",
          justifyContent: "space-between",
          display: "none",
        }}
      >
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 18,
            fontWeight: 900,
            background: "linear-gradient(135deg, #3b82f6, #18f26a)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ReadyZap
        </span>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ background: "none", border: "none", color: "#f2f2ff", cursor: "pointer", padding: 8 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 200,
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-container ${sidebarOpen ? "sidebar-open" : ""}`}>
        <AppSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <main className="main-content flex-1 min-w-0" style={{ marginLeft: 220 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
