import { Send, Users, Smartphone, CheckCircle, Clock, XCircle } from "lucide-react";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";

const recentCampaigns = [
  { id: 1, name: "Promoção Black Friday", status: "completed", sent: 850, failed: 12, date: "2026-02-24" },
  { id: 2, name: "Lançamento Produto X", status: "running", sent: 320, failed: 3, date: "2026-02-25" },
  { id: 3, name: "Reengajamento", status: "paused", sent: 150, failed: 0, date: "2026-02-25" },
];

const statusConfig = {
  completed: { label: "Concluída", icon: CheckCircle, className: "text-primary" },
  running: { label: "Enviando", icon: Clock, className: "text-warning" },
  paused: { label: "Pausada", icon: XCircle, className: "text-muted-foreground" },
};

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos seus disparos</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mensagens Enviadas" value="1.320" icon={Send} description="Últimas 24h" />
        <StatCard title="Contatos" value="4.580" icon={Users} description="Total na base" />
        <StatCard title="Instâncias Ativas" value="3" icon={Smartphone} description="De 5 conectadas" />
        <StatCard title="Taxa de Sucesso" value="98.2%" icon={CheckCircle} description="Média geral" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-5"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Campanhas Recentes</h2>
        <div className="space-y-3">
          {recentCampaigns.map((campaign) => {
            const status = statusConfig[campaign.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            return (
              <div
                key={campaign.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon className={`h-5 w-5 ${status.className}`} />
                  <div>
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">{campaign.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Enviadas: </span>
                    <span className="font-medium text-foreground">{campaign.sent}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Falhas: </span>
                    <span className="font-medium text-destructive">{campaign.failed}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    campaign.status === "completed" ? "bg-primary/10 text-primary" :
                    campaign.status === "running" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
