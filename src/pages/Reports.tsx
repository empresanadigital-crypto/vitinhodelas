import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock, Loader2, Pause, FileText, Calendar, Ban, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Campaign {
  id: string;
  name: string;
  created_at: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  status: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className?: string; style?: React.CSSProperties }> = {
  completed: { label: "Concluída", icon: CheckCircle, className: "badge-ok" },
  sending: { label: "Enviando", icon: Clock, className: "badge-info" },
  running: { label: "Enviando", icon: Clock, className: "badge-info" },
  paused: { label: "Pausada", icon: Pause, className: "badge-warning" },
  draft: { label: "Rascunho", icon: FileText, style: { background: "rgba(255,255,255,0.04)", color: "rgba(242,242,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" } },
  scheduled: { label: "Agendada", icon: Calendar, className: "badge-info" },
  cancelled: { label: "Cancelada", icon: Ban, className: "badge-error" },
};

const metricNumberStyle: React.CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 38,
  fontWeight: 900,
  letterSpacing: "-0.05em",
  background: "linear-gradient(160deg, #ffffff 20%, rgba(200,210,255,0.5) 60%, rgba(242,242,255,0.15))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
  marginBottom: 6,
};

const Reports = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCampaigns = async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, created_at, total_contacts, sent_count, failed_count, status")
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
      setLoading(false);
    };
    fetchCampaigns();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + c.failed_count, 0);
  const successRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent * 100).toFixed(1) : "0.0";

  const statCards = [
    { label: "Total Enviadas", value: totalSent.toLocaleString(), icon: CheckCircle },
    { label: "Total Falhas", value: totalFailed.toLocaleString(), icon: XCircle },
    { label: "Taxa de Sucesso", value: `${successRate}%`, icon: TrendingUp },
    { label: "Campanhas", value: String(campaigns.length), icon: BarChart3 },
  ];

  return (
    <div className="p-6 md:p-7 space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', color: '#f2f2ff' }}>Relatórios</h1>
        <p style={{ fontSize: 12, color: 'rgba(242,242,255,0.28)' }}>Histórico e métricas dos disparos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 transition-colors hover:border-border/60">
            <div className="flex items-start justify-between mb-3">
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: 'rgba(242,242,255,0.25)' }}>
                {s.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <s.icon className="h-4 w-4" style={{ color: '#60a5fa' }} />
              </div>
            </div>
            <div style={metricNumberStyle}>{s.value}</div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden rounded-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: '#f2f2ff' }}>Histórico de Campanhas</h2>
        </div>

        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 border-b border-border px-5 py-3"
          style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(242,242,255,0.2)', background: 'rgba(255,255,255,0.02)' }}>
          <span>Campanha</span>
          <span>Data</span>
          <span>Total</span>
          <span>Enviadas</span>
          <span>Falhas</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-border">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="mb-3 h-10 w-10" style={{ color: 'rgba(242,242,255,0.2)' }} />
              <p className="text-base font-medium mb-1" style={{ color: 'rgba(242,242,255,0.35)' }}>Nenhuma campanha ainda</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(242,242,255,0.35)' }}>Crie sua primeira campanha para ver os relatórios</p>
              <Button onClick={() => navigate("/campanhas")} className="gradient-blue text-primary-foreground" style={{ fontSize: 12, fontWeight: 700 }}>
                <Plus className="mr-2 h-4 w-4" /> Criar primeira campanha
              </Button>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const cfg = statusConfig[campaign.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={campaign.id}
                  className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] md:items-center gap-2 md:gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <span className="font-medium text-foreground">{campaign.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex md:block gap-2">
                    <span className="md:hidden text-xs text-muted-foreground">Total: </span>
                    <span className="text-sm font-mono text-foreground">{campaign.total_contacts.toLocaleString()}</span>
                  </div>
                  <div className="flex md:block gap-2">
                    <span className="md:hidden text-xs text-muted-foreground">Enviadas: </span>
                    <span className="text-sm font-mono text-primary">{campaign.sent_count.toLocaleString()}</span>
                  </div>
                  <div className="flex md:block gap-2">
                    <span className="md:hidden text-xs text-muted-foreground">Falhas: </span>
                    <span className="text-sm font-mono text-destructive">{campaign.failed_count}</span>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-[10px] w-fit ${cfg.className || ''}`}
                    style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 8px', textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                      ...cfg.style,
                    }}
                  >
                    <StatusIcon className="h-3 w-3" /> {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
