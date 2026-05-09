import { useEffect, useState } from "react";
import { Search, Download, FileDown, Send, CheckCircle, BarChart3, Eye, Check, Zap, Pause, X, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  created_at: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  status: string;
}

const PAGE_SIZE = 15;

const statusConfig: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" | "gray"; icon: any }> = {
  completed: { label: "Concluída", tone: "green", icon: Check },
  sending: { label: "Enviando", tone: "blue", icon: Zap },
  paused: { label: "Pausada", tone: "amber", icon: Pause },
  draft: { label: "Rascunho", tone: "gray", icon: FileText },
  scheduled: { label: "Agendada", tone: "blue", icon: Calendar },
  cancelled: { label: "Cancelada", tone: "red", icon: X },
  failed: { label: "Falhou", tone: "red", icon: X },
  stopped: { label: "Parada", tone: "red", icon: X },
};

const toneStyles: Record<string, string> = {
  green: "bg-[var(--pastel-green)] text-[var(--green-dark)]",
  blue: "bg-[var(--pastel-blue)] text-[var(--blue)]",
  amber: "bg-[var(--pastel-yellow)] text-[var(--amber)]",
  red: "bg-[#FEE2E2] text-[var(--red)]",
  gray: "bg-[var(--pastel-gray)] text-[var(--text-muted)]",
};

const Reports = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("30d");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setCampaigns((data as Campaign[]) || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [toast]);

  // Filter
  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const created = new Date(c.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    let matchDate = true;
    if (dateFilter === "7d") matchDate = diffDays <= 7;
    else if (dateFilter === "30d") matchDate = diffDays <= 30;
    else if (dateFilter === "thisMonth") {
      matchDate = created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    } else if (dateFilter === "lastMonth") {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      matchDate = created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear;
    }
    return matchSearch && matchStatus && matchDate;
  });

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // KPIs
  const totalSent = filtered.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalFailed = filtered.reduce((acc, c) => acc + (c.failed_count || 0), 0);
  const total = totalSent + totalFailed;
  const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

  // Export CSV
  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "Sem dados", description: "Nenhuma campanha pra exportar.", variant: "destructive" });
      return;
    }
    const header = ["Nome", "Data", "Total", "Enviadas", "Falhas", "Taxa de sucesso", "Status"];
    const rows = filtered.map((c) => {
      const tot = c.sent_count + c.failed_count;
      const rate = tot > 0 ? Math.round((c.sent_count / tot) * 100) : 0;
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        new Date(c.created_at).toLocaleDateString("pt-BR"),
        c.total_contacts,
        c.sent_count,
        c.failed_count,
        `${rate}%`,
        statusConfig[c.status]?.label || c.status,
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-campanhas-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!", description: `${filtered.length} campanhas baixadas.` });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border-strong)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-9 pb-12 pt-7 max-w-[1440px]">
      {/* Topbar */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[38px] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--text)]">Relatórios</h1>
          <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">Histórico completo de campanhas e estatísticas</p>
        </div>
        <div className="flex gap-2.5">
          <button
            disabled
            title="PDF disponível na próxima versão"
            className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-muted)] opacity-60 cursor-not-allowed"
          >
            <FileDown className="h-3.5 w-3.5" />
            Exportar PDF (em breve)
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[1.5px_1.5px_0_var(--border-strong)]"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Total de envios</span>
            <Send className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[42px] font-bold leading-none tracking-[-0.03em] text-[var(--text)]">{totalSent.toLocaleString("pt-BR")}</div>
          <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">{filtered.length} campanhas no período</div>
        </div>
        <div className="rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Taxa de sucesso</span>
            <CheckCircle className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[42px] font-bold leading-none tracking-[-0.03em] text-[var(--text)]">
            {successRate}<span className="text-[24px] text-[var(--text-muted)]">%</span>
          </div>
          <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">{totalFailed} falhas registradas</div>
        </div>
        <div className="rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Campanhas</span>
            <BarChart3 className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[42px] font-bold leading-none tracking-[-0.03em] text-[var(--text)]">{filtered.length}</div>
          <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">no período selecionado</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative max-w-[320px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Buscar campanha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-10 pr-3.5 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none cursor-pointer"
        >
          <option value="all">Todos os status</option>
          <option value="completed">Concluídas</option>
          <option value="sending">Enviando</option>
          <option value="paused">Pausadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="stopped">Paradas</option>
          <option value="draft">Rascunhos</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none cursor-pointer"
        >
          <option value="all">Todo o período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="thisMonth">Este mês</option>
          <option value="lastMonth">Mês passado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        {paginated.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-[14px] text-[var(--text-muted)]">
              {search || statusFilter !== "all"
                ? "Nenhuma campanha encontrada com esses filtros."
                : "Nenhuma campanha ainda. Crie sua primeira em Campanhas."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Campanha</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Data</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Total</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Enviadas</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Falhas</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Taxa</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const cfg = statusConfig[c.status] || { label: c.status, tone: "gray" as const, icon: FileText };
                  const Icon = cfg.icon;
                  const tot = c.sent_count + c.failed_count;
                  const rate = tot > 0 ? Math.round((c.sent_count / tot) * 100) : 0;
                  let rateColor = "text-[var(--text-muted)]";
                  if (rate >= 90) rateColor = "text-[var(--green-dark)]";
                  else if (rate >= 70) rateColor = "text-[var(--blue)]";
                  else if (rate >= 50) rateColor = "text-[var(--amber)]";
                  else if (rate > 0) rateColor = "text-[var(--red)]";
                  return (
                    <tr key={c.id} className="border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--pastel-gray)]">
                      <td className="px-5 py-3.5 text-[13px] font-bold text-[var(--text)]">{c.name}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--text)]">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--text)]">{c.total_contacts}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--text)]">{c.sent_count}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--text)]">{c.failed_count}</td>
                      <td className={`px-5 py-3.5 text-[13px] font-bold ${rateColor}`}>{tot > 0 ? `${rate}%` : "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--border-strong)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${toneStyles[cfg.tone]}`}>
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 border-t border-[var(--border-color)] px-4 py-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border-[1.5px] border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-3 text-[13px] text-[var(--text-muted)]">
              Página <strong className="text-[var(--text)]">{currentPage}</strong> de <strong className="text-[var(--text)]">{totalPages}</strong>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border-[1.5px] border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
