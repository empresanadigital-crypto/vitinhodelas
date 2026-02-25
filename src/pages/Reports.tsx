import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import StatCard from "@/components/StatCard";

const campaignHistory = [
  { id: 1, name: "Black Friday 2025", date: "2025-11-29", total: 2500, sent: 2480, failed: 20, status: "completed" },
  { id: 2, name: "Natal 2025", date: "2025-12-20", total: 1800, sent: 1795, failed: 5, status: "completed" },
  { id: 3, name: "Ano Novo 2026", date: "2026-01-01", total: 3200, sent: 3150, failed: 50, status: "completed" },
  { id: 4, name: "Carnaval 2026", date: "2026-02-15", total: 1500, sent: 1500, failed: 0, status: "completed" },
  { id: 5, name: "Promoção Fevereiro", date: "2026-02-25", total: 1000, sent: 650, failed: 8, status: "running" },
];

const Reports = () => {
  const totalSent = campaignHistory.reduce((acc, c) => acc + c.sent, 0);
  const totalFailed = campaignHistory.reduce((acc, c) => acc + c.failed, 0);
  const successRate = ((totalSent - totalFailed) / totalSent * 100).toFixed(1);

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
        <StatCard title="Campanhas" value={campaignHistory.length} icon={BarChart3} />
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
          {campaignHistory.map((campaign) => (
            <div
              key={campaign.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/30"
            >
              <span className="font-medium text-foreground">{campaign.name}</span>
              <span className="text-sm text-muted-foreground">{campaign.date}</span>
              <span className="text-sm font-mono text-foreground">{campaign.total.toLocaleString()}</span>
              <span className="text-sm font-mono text-primary">{campaign.sent.toLocaleString()}</span>
              <span className="text-sm font-mono text-destructive">{campaign.failed}</span>
              <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                campaign.status === "completed"
                  ? "bg-primary/10 text-primary"
                  : "bg-warning/10 text-warning"
              }`}>
                {campaign.status === "completed" ? (
                  <><CheckCircle className="h-3 w-3" /> Concluída</>
                ) : (
                  <><Clock className="h-3 w-3" /> Enviando</>
                )}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
