import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const [apiProvider, setApiProvider] = useState("z-api");
  const [defaultInterval, setDefaultInterval] = useState("15");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        toast({ title: "Erro", description: "Não foi possível carregar suas configurações.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)) {
        const s = data.settings as Record<string, unknown>;
        if (s.api_provider) setApiProvider(s.api_provider as string);
        if (s.default_interval) setDefaultInterval(String(s.default_interval));
        if (s.api_base_url) setApiBaseUrl(s.api_base_url as string);
        if (s.api_token) setApiToken(s.api_token as string);
      }

      setLoading(false);
    };

    load();
  }, [user, toast]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const settings = {
        api_provider: apiProvider,
        default_interval: parseInt(defaultInterval) || 15,
        api_base_url: apiBaseUrl,
        api_token: apiToken,
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            settings: settings as any,
          },
          { onConflict: "id" }
        )
        .select("settings")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Perfil do usuário não encontrado para salvar configurações.");

      toast({ title: "Salvo!", description: "Configurações salvas com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-7 space-y-6">
      <div>
        <h1 className="text-foreground" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Configurações</h1>
        <p className="text-xs text-muted-foreground">Configurações gerais do disparador</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-2xl space-y-6 rounded-xl p-6"
      >
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>API WhatsApp</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Provedor Padrão</Label>
              <Select value={apiProvider} onValueChange={setApiProvider}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="z-api">Z-API</SelectItem>
                  <SelectItem value="baileys">Disparo Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">URL Base da API</Label>
              <Input
                placeholder="https://api.z-api.io/instances/"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">Token / API Key</Label>
              <Input
                type="password"
                placeholder="Seu token de acesso"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Disparos</h2>
          <div>
            <Label className="text-foreground">Intervalo padrão entre mensagens (segundos)</Label>
            <Input
              type="number"
              min="5"
              value={defaultInterval}
              onChange={(e) => setDefaultInterval(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-blue text-primary-foreground font-semibold"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
          <span>⚠️</span>
          <span>Estas configurações são salvas no seu perfil mas ainda não afetam o comportamento do disparo. Use a seleção de instância na tela de Campanhas.</span>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
