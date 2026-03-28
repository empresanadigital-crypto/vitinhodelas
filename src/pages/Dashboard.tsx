import { useEffect, useState } from "react";
import { Send, Users, Smartphone, CheckCircle, Clock, XCircle, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  completed: { label: "Concluída", badge: "badge-ok" },
  running: { label: "Enviando", badge: "badge-running" },
  paused: { label: "Pausada", badge: "badge-draft" },
  draft: { label: "Rascunho", badge: "badge-draft" },
  scheduled: { label: "Agendada", badge: "badge-running" },
};

const Dashboard = () => {
  const [stats, setStats] = useState({ contacts: 0, instances: 0, campaigns: 0, totalSent: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div style={{ padding: 28 }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "hsl(var(--foreground))",
              marginBottom: 2,
            }}
          >
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "rgba(242,242,255,0.22)" }}>
            Visão geral dos seus disparos
          </p>
        </div>
        <button
          onClick={() => navigate("/campanhas")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "hsl(var(--primary))",
            color: "#fff",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            padding: "9px 18px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 16px rgba(59,130,246,0.25)",
            transition: "all .13s",
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Nova Campanha
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22 }}>
        {[
          { label: "Mensagens Enviadas", value: stats.totalSent.toLocaleString(), desc: "Total", up: false },
          { label: "Contatos", value: stats.contacts.toLocaleString(), desc: "Total na base", up: false },
          { label: "Instâncias Ativas", value: String(stats.instances), desc: "Conectadas", up: false },
          { label: "Campanhas", value: String(stats.campaigns), desc: "Total criadas", up: false },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: "hsl(235 12% 10%)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 16,
              transition: "border-color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                color: "rgba(242,242,255,0.22)",
                marginBottom: 10,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "hsl(var(--foreground))",
                lineHeight: 1,
                marginBottom: 5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: s.up ? "#18f26a" : "rgba(242,242,255,0.22)" }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns Table */}
      <div
        style={{
          background: "hsl(235 12% 10%)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 90px 100px",
            padding: "9px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "hsl(235 14% 7%)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase" as const,
            color: "rgba(242,242,255,0.22)",
          }}
        >
          <div>Campanha</div>
          <div>Enviadas</div>
          <div>Falhas</div>
          <div>Status</div>
        </div>

        {/* Table Rows */}
        {campaigns.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "rgba(242,242,255,0.22)", fontSize: 13 }}>
            Nenhuma campanha ainda. Crie sua primeira!
          </div>
        ) : (
          campaigns.map((campaign) => {
            const status = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.draft;
            return (
              <div
                key={campaign.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px 100px",
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  alignItems: "center",
                  transition: "background .12s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    {campaign.name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(242,242,255,0.10)", marginTop: 1 }}>
                    {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "rgba(242,242,255,0.50)", fontWeight: 500 }}>
                  {campaign.sent_count}
                </div>
                <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 500 }}>
                  {campaign.failed_count}
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 5,
                      ...(campaign.status === "completed"
                        ? {
                            background: "rgba(24,242,106,0.08)",
                            color: "#18f26a",
                            border: "1px solid rgba(24,242,106,0.18)",
                          }
                        : campaign.status === "running" || campaign.status === "scheduled"
                        ? {
                            background: "rgba(59,130,246,0.10)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59,130,246,0.22)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            color: "rgba(242,242,255,0.22)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }),
                    }}
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
