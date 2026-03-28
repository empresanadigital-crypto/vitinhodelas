import { useEffect, useState } from "react";
import { Send, Users, Smartphone, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  completed: { label: "Concluída", icon: CheckCircle, className: "text-primary" },
  running: { label: "Enviando", icon: Clock, className: "text-warning" },
  paused: { label: "Pausada", icon: XCircle, className: "text-muted-foreground" },
  draft: { label: "Rascunho", icon: Clock, className: "text-muted-foreground" },
  scheduled: { label: "Agendada", icon: Clock, className: "text-info" },
};

const Dashboard = () => {
  const [stats, setStats] = useState({ contacts: 0, instances: 0, campaigns: 0, totalSent: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [contactsRes, instancesRes, allCampaignsRes, recentCampaignsRes] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("instances").select("id, status"),
        supabase.from("campaigns").select("id, sent_count, failed_count"),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const activeInstances = (instancesRes.data || []).filter((i: any) => i.status === "connected").length;
      const allCampaigns = allCampaignsRes.data || [];
      const totalSent = allCampaigns.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0);

      setStats({
        contacts: contactsRes.count || 0,
        instances: activeInstances,
        campaigns: allCampaigns.length,
        totalSent,
      });
      setCampaigns(recentCampaignsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos seus disparos</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mensagens Enviadas" value={stats.totalSent.toLocaleString()} icon={Send} description="Total" />
        <StatCard title="Contatos" value={stats.contacts.toLocaleString()} icon={Users} description="Total na base" />
        <StatCard title="Instâncias Ativas" value={stats.instances} icon={Smartphone} description="Conectadas" />
        <StatCard title="Campanhas" value={stats.campaigns} icon={CheckCircle} description="Total criadas" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Campanhas Recentes</h2>
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Nenhuma campanha ainda. Crie sua primeira!</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.draft;
              const StatusIcon = status.icon;
              return (
                <div key={campaign.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-4 hover:bg-[hsl(235,12%,11%)] transition-colors">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${status.className}`} />
                    <div>
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(campaign.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Enviadas: </span>
                      <span className="font-medium text-foreground">{campaign.sent_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Falhas: </span>
                      <span className="font-medium text-destructive">{campaign.failed_count}</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      campaign.status === "completed" ? "bg-success/10 text-success" :
                      campaign.status === "running" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
