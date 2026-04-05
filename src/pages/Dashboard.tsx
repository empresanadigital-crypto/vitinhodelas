import { useEffect, useState } from "react";
import { Plus, Loader2, Send, Users, Smartphone, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingTour from "@/components/OnboardingTour";

const statusConfig: Record<string, { label: string; className?: string; style?: React.CSSProperties }> = {
  completed: { label: "Concluída", className: "badge-ok" },
  sending: { label: "Enviando", className: "badge-info" },
  paused: { label: "Pausada", className: "badge-warning" },
  draft: {
    label: "Rascunho",
    style: { background: "rgba(255,255,255,0.04)", color: "rgba(242,242,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" },
  },
  scheduled: { label: "Agendada", className: "badge-info" },
  cancelled: { label: "Cancelada", className: "badge-error" },
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

const Dashboard = () => {
  const [stats, setStats] = useState({ contacts: 0, instances: 0, campaigns: 0, totalSent: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-7 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              color: "#f2f2ff",
              marginBottom: 2,
            }}
          >
            Dashboard
          </h1>
          <p className="text-xs" style={{ color: "rgba(242,242,255,0.28)" }}>
            Visão geral dos seus disparos
          </p>
        </div>
        <Button
          onClick={() => navigate("/campanhas")}
          className="gradient-blue text-primary-foreground font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Mensagens Enviadas", value: stats.totalSent.toLocaleString(), desc: "Total", icon: Send },
          { label: "Contatos", value: stats.contacts.toLocaleString(), desc: "Total na base", icon: Users },
          { label: "Instâncias Ativas", value: String(stats.instances), desc: "Conectadas", icon: Smartphone },
          { label: "Campanhas", value: String(stats.campaigns), desc: "Total criadas", icon: BarChart3 },
        ].map((s, i) => (
          <div
            key={i}
            className="glass-card rounded-xl p-4 transition-colors hover:border-border/60"
          >
            <div className="flex items-start justify-between mb-3">
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase" as const,
                  color: "rgba(242,242,255,0.25)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {s.label}
              </span>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "rgba(59,130,246,0.08)" }}
              >
                <s.icon className="h-4 w-4" style={{ color: "#60a5fa" }} />
              </div>
            </div>
            <div style={metricNumberStyle}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 400, color: "rgba(242,242,255,0.28)" }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Table Header */}
        <div
          className="hidden sm:grid px-5 py-3 border-b border-border"
          style={{
            gridTemplateColumns: "1fr 90px 90px 100px",
            background: "rgba(255,255,255,0.02)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(242,242,255,0.2)",
          }}
        >
          <div>Campanha</div>
          <div>Enviadas</div>
          <div>Falhas</div>
          <div>Status</div>
        </div>

        {/* Table Rows */}
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Send className="mb-3 h-10 w-10" />
            <p className="text-base font-medium mb-1">Nenhuma campanha ainda</p>
            <p className="text-sm mb-4">Crie sua primeira campanha para começar a disparar</p>
            <Button onClick={() => navigate("/campanhas")} className="gradient-blue text-primary-foreground font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Criar primeira campanha
            </Button>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const status = statusConfig[campaign.status as string] || statusConfig.draft;
            return (
              <div
                key={campaign.id}
                className="flex flex-col sm:grid gap-2 sm:gap-0 px-5 py-4 border-b border-border transition-colors hover:bg-white/[0.02] cursor-pointer"
                style={{ gridTemplateColumns: "1fr 90px 90px 100px", alignItems: "center" }}
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {campaign.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex sm:block gap-4">
                  <span className="sm:hidden text-xs text-muted-foreground">Enviadas: </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {campaign.sent_count}
                  </span>
                </div>
                <div className="flex sm:block gap-4">
                  <span className="sm:hidden text-xs text-muted-foreground">Falhas: </span>
                  <span className="text-sm text-destructive font-medium">
                    {campaign.failed_count}
                  </span>
                </div>
                <div>
                  <span
                    className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-md ${status.className || ""}`}
                    style={status.style}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
