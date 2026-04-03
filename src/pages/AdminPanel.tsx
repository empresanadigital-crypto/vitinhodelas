import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, BarChart3, Send, ShieldCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  slug: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  plan_id: string | null;
  messages_sent_this_month: number;
  plan_name: string;
  instance_count: number;
}

const AdminPanel = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, campaignsToday: 0, messagesToday: 0 });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [profilesRes, plansRes, campaignsTodayRes, instancesRes] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, is_active, plan_id, messages_sent_this_month, plans(name, slug)"),
      supabase.from("plans").select("id, name, slug").eq("active", true).order("sort_order"),
      supabase.from("campaigns").select("id, sent_count").gte("created_at", todayISO),
      supabase.from("instances").select("user_id"),
    ]);

    const allPlans = plansRes.data || [];
    setPlans(allPlans);

    // Count instances per user
    const instanceCountMap: Record<string, number> = {};
    (instancesRes.data || []).forEach((inst: any) => {
      instanceCountMap[inst.user_id] = (instanceCountMap[inst.user_id] || 0) + 1;
    });

    const allProfiles: UserProfile[] = (profilesRes.data || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      is_active: p.is_active,
      plan_id: p.plan_id,
      messages_sent_this_month: p.messages_sent_this_month || 0,
      plan_name: p.plans?.name || "Free",
      instance_count: instanceCountMap[p.id] || 0,
    }));

    setProfiles(allProfiles);

    const campaignsToday = campaignsTodayRes.data || [];
    const messagesToday = campaignsToday.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0);

    setStats({
      totalUsers: allProfiles.length,
      activeUsers: allProfiles.filter((p) => p.is_active).length,
      campaignsToday: campaignsToday.length,
      messagesToday,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleActive = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", userId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, is_active: !currentStatus } : p)));
    toast({ title: "Atualizado", description: `Usuário ${!currentStatus ? "ativado" : "desativado"}.` });
  };

  const changePlan = async (userId: string, planId: string) => {
    const newPlanId = planId === "none" ? null : planId;
    const { error } = await supabase.from("profiles").update({ plan_id: newPlanId }).eq("id", userId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    const planName = plans.find((p) => p.id === planId)?.name || "Free";
    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, plan_id: newPlanId, plan_name: newPlanId ? planName : "Free" } : p))
    );
    toast({ title: "Plano atualizado", description: `Plano alterado para ${newPlanId ? planName : "Free"}.` });
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (p.email?.toLowerCase().includes(q) || p.full_name?.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Total de Usuários", value: stats.totalUsers, icon: Users },
    { label: "Usuários Ativos", value: stats.activeUsers, icon: ShieldCheck },
    { label: "Campanhas Hoje", value: stats.campaignsToday, icon: BarChart3 },
    { label: "Mensagens Hoje", value: stats.messagesToday, icon: Send },
  ];

  return (
    <div className="p-6 md:p-7 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-foreground"
          style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          Painel Administrativo
        </h1>
        <p className="text-xs text-muted-foreground">Gerencie usuários, planos e o sistema</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 transition-colors hover:border-border/60">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{s.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "hsl(var(--foreground))",
                lineHeight: 1,
                marginBottom: 5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        {/* Table header */}
        <div
          className="hidden lg:grid px-5 py-3 border-b border-border"
          style={{
            gridTemplateColumns: "1.5fr 1fr 0.7fr 0.7fr 0.5fr 0.6fr 1fr",
            background: "hsl(235 14% 7%)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "rgba(242,242,255,0.22)",
          }}
        >
          <div>Email</div>
          <div>Nome</div>
          <div>Plano</div>
          <div>Msgs/Mês</div>
          <div>Instâncias</div>
          <div>Status</div>
          <div>Ações</div>
        </div>

        {/* Table rows */}
        {filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="mb-3 h-10 w-10" />
            <p className="text-base font-medium">Nenhum usuário encontrado</p>
          </div>
        ) : (
          filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-col lg:grid gap-2 lg:gap-0 px-5 py-4 border-b border-border transition-colors hover:bg-white/[0.02]"
              style={{ gridTemplateColumns: "1.5fr 1fr 0.7fr 0.7fr 0.5fr 0.6fr 1fr", alignItems: "center" }}
            >
              {/* Email */}
              <div className="text-sm text-foreground font-medium truncate" title={profile.email || ""}>
                {profile.email || "—"}
              </div>

              {/* Nome */}
              <div className="text-sm text-muted-foreground truncate">
                {profile.full_name || "—"}
              </div>

              {/* Plano */}
              <div className="text-sm text-muted-foreground font-medium">
                {profile.plan_name}
              </div>

              {/* Msgs */}
              <div className="text-sm text-muted-foreground font-medium tabular-nums">
                {profile.messages_sent_this_month.toLocaleString()}
              </div>

              {/* Instâncias */}
              <div className="text-sm text-muted-foreground font-medium tabular-nums">
                {profile.instance_count}
              </div>

              {/* Status */}
              <div>
                <span
                  className="inline-flex text-[10px] font-bold px-2.5 py-1 rounded-md"
                  style={
                    profile.is_active
                      ? { background: "rgba(24,242,106,0.08)", color: "#18f26a", border: "1px solid rgba(24,242,106,0.18)" }
                      : { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.18)" }
                  }
                >
                  {profile.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={profile.is_active}
                  onCheckedChange={() => toggleActive(profile.id, profile.is_active)}
                />
                <Select
                  value={profile.plan_id || "none"}
                  onValueChange={(val) => changePlan(profile.id, val)}
                >
                  <SelectTrigger className="h-8 w-[110px] bg-secondary border-border text-foreground text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Free</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
