import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock, Loader2, Pause, FileText, Calendar, Ban } from "lucide-react";
import StatCard from "@/components/StatCard";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Histórico e métricas dos disparos</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <h2 className="font-semibold text-foreground">Histórico de Campanhas</h2>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Campanha</span>
          <span>Data</span>
          <span>Total</span>
          <span>Enviadas</span>
          <span>Falhas</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-border">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="mb-2 h-8 w-8" />
              <p>Nenhuma campanha ainda</p>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const cfg = statusConfig[campaign.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={campaign.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-[hsl(235,12%,11%)]"
                >
                  <span className="font-medium text-foreground">{campaign.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-sm font-mono text-foreground">{campaign.total_contacts.toLocaleString()}</span>
                  <span className="text-sm font-mono text-primary">{campaign.sent_count.toLocaleString()}</span>
                  <span className="text-sm font-mono text-destructive">{campaign.failed_count}</span>
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
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
