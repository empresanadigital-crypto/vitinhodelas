import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AppSidebar from "./AppSidebar";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-[100] hidden h-14 items-center justify-between border-b-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 max-md:flex">
        <div className="flex items-center gap-2">
          <img src="/readyzap-logo.png" alt="ReadyZap" className="h-7 w-7 rounded-md border-[1.5px] border-[var(--border-strong)]" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold text-[var(--text)] tracking-tight">ReadyZap</span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">SENDER</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)]"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[200] bg-black/60 md:hidden"
        />
      )}

      {/* Sidebar wrapper (mobile slide-in) */}
      <div
        className={[
          "z-[201] transition-transform duration-300",
          "max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:w-[260px]",
          sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
        ].join(" ")}
      >
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <AppSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <main className="ml-0 min-h-screen pt-14 md:ml-[240px] md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
