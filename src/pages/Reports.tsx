import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock, Loader2, Pause, FileText, Calendar, Ban, Send, Plus } from "lucide-react";
import StatCard from "@/components/StatCard";
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

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  completed: { label: "Concluída", icon: CheckCircle, className: "bg-success/10 text-success" },
  sending: { label: "Enviando", icon: Clock, className: "bg-yellow-500/10 text-yellow-500" },
  running: { label: "Enviando", icon: Clock, className: "bg-yellow-500/10 text-yellow-500" },
  paused: { label: "Pausada", icon: Pause, className: "bg-orange-500/10 text-orange-500" },
  draft: { label: "Rascunho", icon: FileText, className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Agendada", icon: Calendar, className: "bg-blue-500/10 text-blue-500" },
  cancelled: { label: "Cancelada", icon: Ban, className: "bg-destructive/10 text-destructive" },
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

  return (
    <div className="p-6 md:p-7 space-y-6">
      <div>
        <h1 className="text-foreground" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em' }}>Relatórios</h1>
        <p className="text-xs text-muted-foreground">Histórico e métricas dos disparos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Enviadas" value={totalSent.toLocaleString()} icon={CheckCircle} />
        <StatCard title="Total Falhas" value={totalFailed.toLocaleString()} icon={XCircle} />
        <StatCard title="Taxa de Sucesso" value={`${successRate}%`} icon={TrendingUp} />
        <StatCard title="Campanhas" value={campaigns.length} icon={BarChart3} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden rounded-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Histórico de Campanhas</h2>
        </div>

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 border-b border-border px-5 py-3 text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Campanha</span>
          <span>Data</span>
          <span>Total</span>
          <span>Enviadas</span>
          <span>Falhas</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-border">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3 className="mb-3 h-10 w-10" />
              <p className="text-base font-medium mb-1">Nenhuma campanha ainda</p>
              <p className="text-sm mb-4">Crie sua primeira campanha para ver os relatórios</p>
              <Button onClick={() => navigate("/campanhas")} className="gradient-blue text-primary-foreground font-semibold">
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
                  className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] md:items-center gap-2 md:gap-4 px-5 py-3 transition-colors hover:bg-[hsl(235,12%,11%)]"
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
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 w-fit ${cfg.className}`} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.75rem' }}>
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
