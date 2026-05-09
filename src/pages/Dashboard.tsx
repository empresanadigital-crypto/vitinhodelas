import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Send, Users, Smartphone, CheckCircle, ArrowRight, Check, Zap, Pause, X, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  id: string;
  name: string;
  created_at: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  status: string;
}

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

const Dashboard = () => {
  const [stats, setStats] = useState({ contacts: 0, instances: 0, totalSent: 0, successRate: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [contactsRes, instancesRes, allCampaignsRes, recentRes] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("instances").select("id, status"),
        supabase.from("campaigns").select("id, sent_count, failed_count"),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const activeInstances = (instancesRes.data || []).filter((i: any) => i.status === "connected").length;
      const allCampaigns = allCampaignsRes.data || [];
      const totalSent = allCampaigns.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0);
      const totalFailed = allCampaigns.reduce((acc: number, c: any) => acc + (c.failed_count || 0), 0);
      const total = totalSent + totalFailed;
      const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

      setStats({
        contacts: contactsRes.count || 0,
        instances: activeInstances,
        totalSent,
        successRate,
      });
      setCampaigns(recentRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

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
      <div className="mb-7 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[38px] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--text)]">Dashboard</h1>
          <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">Visão geral dos seus disparos</p>
        </div>
        <button
          onClick={() => navigate("/campanhas")}
          className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)]"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Send} label="Mensagens enviadas" value={stats.totalSent.toLocaleString("pt-BR")} foot="Total acumulado" />
        <Kpi icon={Users} label="Contatos" value={stats.contacts.toLocaleString("pt-BR")} foot="Total na base" />
        <Kpi icon={Smartphone} label="Instâncias ativas" value={stats.instances.toString()} foot="Conectadas" />
        <Kpi icon={CheckCircle} label="Taxa de sucesso" value={stats.successRate.toString()} unit="%" foot="Últimos disparos" />
      </div>

      {/* Histórico */}
      <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
          <div>
            <div className="text-[16px] font-bold text-[var(--text)]">Últimas campanhas</div>
            <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">Resumo das 5 mais recentes</div>
          </div>
          <button
            onClick={() => navigate("/relatorios")}
            className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[1.5px_1.5px_0_var(--border-strong)]"
          >
            Ver todas em Relatórios
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Send className="mx-auto mb-3 h-7 w-7 text-[var(--text-muted)]" />
            <p className="text-[14px] text-[var(--text-muted)]">Nenhuma campanha ainda.</p>
            <button
              onClick={() => navigate("/campanhas")}
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-[#1D1D1B] shadow-[var(--shadow-sm)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[var(--shadow-md)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar primeira campanha
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Campanha</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Data</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Enviadas</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Progresso</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const cfg = statusConfig[c.status] || { label: c.status, tone: "gray" as const, icon: FileText };
                  const Icon = cfg.icon;
                  const total = c.total_contacts || 0;
                  const sent = c.sent_count || 0;
                  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--pastel-gray)]">
                      <td className="px-5 py-3.5 text-[13px] font-bold text-[var(--text)]">{c.name}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--text)]">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--text)]">{sent} / {total}</td>
                      <td className="px-5 py-3.5">
                        <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--pastel-gray)]">
                          <span className="block h-full rounded-full bg-[var(--green-fn)]" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
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
      </div>
    </div>
  );
};

function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  foot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  foot: string;
}) {
  return (
    <div className="rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-md)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</span>
        <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <div className="text-[42px] font-bold leading-none tracking-[-0.03em] text-[var(--text)]">
        {value}
        {unit && <span className="text-[24px] text-[var(--text-muted)]">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">{foot}</div>
    </div>
  );
}

export default Dashboard;
