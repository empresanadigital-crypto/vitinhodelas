import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Smartphone, QrCode, Trash2, RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Instance {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  provider: string;
  messages_sent: number;
  instance_id: string | null;
  token: string | null;
  client_token: string | null;
}

const Instances = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState("");
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState<"evolution" | "z-api">("evolution");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [zapiClientToken, setZapiClientToken] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInstances = useCallback(async () => {
    const { data, error } = await supabase
      .from("instances")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setInstances(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // ─── CREATE ───────────────────────────────────────────
  const addInstance = async () => {
    if (!newName.trim()) {
      toast({ title: "Erro", description: "Preencha o nome da instância", variant: "destructive" });
      return;
    }

    try {
      if (newProvider === "evolution") {
        const instanceName = newName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

        const { data: evoData, error: evoError } = await supabase.functions.invoke("evolution-proxy", {
          body: { action: "create-instance", instanceName },
        });
        if (evoError) throw evoError;
        if (!evoData?.success) throw new Error(evoData?.error || "Erro ao criar instância");

        await supabase.from("instances").insert({
          user_id: user!.id,
          name: newName.trim(),
          provider: "evolution",
          instance_id: instanceName,
          status: "disconnected",
        });

        toast({ title: "Sucesso!", description: "Instância Evolution criada! Clique em QR Code para conectar." });

        // Show QR if it came with creation
        const qrBase64 = evoData?.data?.qrcode?.base64;
        if (qrBase64) {
          setQrImage(qrBase64.startsWith("data:image") ? qrBase64 : `data:image/png;base64,${qrBase64}`);
          setQrDialogOpen(true);
        }
      } else {
        // Z-API: user provides their own credentials
        if (!zapiInstanceId.trim() || !zapiToken.trim()) {
          toast({ title: "Erro", description: "Preencha Instance ID e Token da Z-API", variant: "destructive" });
          return;
        }

        await supabase.from("instances").insert({
          user_id: user!.id,
          name: newName.trim(),
          provider: "z-api",
          instance_id: zapiInstanceId.trim(),
          token: zapiToken.trim(),
          client_token: zapiClientToken.trim() || null,
          status: "disconnected",
        });

        toast({ title: "Sucesso!", description: "Instância Z-API adicionada! Clique em QR Code para conectar." });
      }

      setNewName("");
      setZapiInstanceId("");
      setZapiToken("");
      setZapiClientToken("");
      setDialogOpen(false);
      fetchInstances();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // ─── QR CODE ──────────────────────────────────────────
  const getQrCode = async (instance: Instance) => {
    setQrLoading(true);
    setQrDialogOpen(true);
    setQrImage(null);
    setQrStatus("Conectando...");

    try {
      if (instance.provider === "z-api") {
        await getQrCodeZapi(instance);
      } else {
        await getQrCodeEvolution(instance);
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar QR", description: error.message, variant: "destructive" });
      setQrDialogOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const getQrCodeZapi = async (instance: Instance) => {
    if (!instance.instance_id || !instance.token) {
      throw new Error("Instance ID ou Token não configurados para Z-API");
    }

    const { data, error } = await supabase.functions.invoke("zapi-proxy", {
      body: {
        action: "qr-code",
        instanceId: instance.instance_id,
        token: instance.token,
        clientToken: instance.client_token,
      },
    });

    if (error) throw error;

    const qr = data?.data?.base64 || data?.data?.value;
    if (qr) {
      setQrImage(qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);
    } else {
      // Check if already connected
      const { data: statusData } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          action: "status",
          instanceId: instance.instance_id,
          token: instance.token,
          clientToken: instance.client_token,
        },
      });

      const connected = statusData?.data?.connected;
      if (connected) {
        toast({ title: "Já conectado!", description: "Esta instância Z-API já está conectada." });
        await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
        fetchInstances();
        setQrDialogOpen(false);
      } else {
        toast({ title: "QR não disponível", description: "Verifique suas credenciais Z-API." });
        setQrDialogOpen(false);
      }
    }
  };

  const extractQrImage = (payload: any) => {
    const rawQr =
      payload?.data?.base64 ??
      payload?.data?.code ??
      payload?.data?.qrcode?.base64 ??
      payload?.data?.qrcode?.code ??
      payload?.data?.instance?.qrcode?.base64;

    if (!rawQr || typeof rawQr !== "string") return null;
    return rawQr.startsWith("data:image") ? rawQr : `data:image/png;base64,${rawQr}`;
  };

  const getQrCodeEvolution = async (instance: Instance) => {
    if (!instance.instance_id) throw new Error("Instance ID não configurado");

    setQrStatus("Verificando status...");
    // 1. Check current status first
    const { data: statusData } = await supabase.functions.invoke("evolution-proxy", {
      body: { action: "status", instanceName: instance.instance_id },
    });

    const state = statusData?.data?.instance?.state ?? statusData?.data?.state;

    // Already connected
    if (state === "open") {
      toast({ title: "Já conectado!", description: "Esta instância já está conectada ao WhatsApp." });
      await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
      fetchInstances();
      setQrDialogOpen(false);
      return;
    }

    // 2. If stuck in "connecting" or not found, delete and recreate for a clean QR cycle
    if (state === "connecting" || !statusData?.success || statusData?.error === "not_found") {
      setQrStatus("Reiniciando instância...");
      // Delete silently (may fail if not found, that's ok)
      try {
        await supabase.functions.invoke("evolution-proxy", {
          body: { action: "delete-instance", instanceName: instance.instance_id },
        });
      } catch { /* ignore */ }

      // Wait a moment for cleanup
      await new Promise((r) => setTimeout(r, 2000));

      setQrStatus("Criando nova sessão...");
      // Recreate
      const { data: createData } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "create-instance", instanceName: instance.instance_id },
      });
      const qrFromCreate = extractQrImage(createData);
      if (qrFromCreate) {
        setQrImage(qrFromCreate);
        return;
      }
    }

    // 3. Poll for QR code — wait 3s for Baileys to initialize, then check every 2s
    setQrStatus("Aguardando WhatsApp gerar QR Code...");
    await new Promise((r) => setTimeout(r, 3000));

    for (let attempt = 0; attempt < 10; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "qr-code", instanceName: instance.instance_id },
      });

      if (error) throw error;

      const qrImageData = extractQrImage(data);
      if (qrImageData) {
        setQrImage(qrImageData);
        return;
      }

      // Check if connected during polling
      const s = data?.data?.instance?.state ?? data?.data?.state;
      if (s === "open") {
        toast({ title: "Conectado!", description: "Instância conectada ao WhatsApp." });
        await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
        fetchInstances();
        setQrDialogOpen(false);
        return;
      }

      // If count > 0 but no base64, the QR was generated but we missed the format
      const count = data?.data?.count ?? data?.data?.qrcode?.count;
      if (count && count > 0) {
        console.log("QR count > 0 but no image extracted, raw data:", JSON.stringify(data));
      }
    }

    toast({
      title: "QR não gerado",
      description: "A Evolution API na VPS está lenta. Verifique se o Docker está rodando e tente novamente.",
      variant: "destructive",
    });
    setQrDialogOpen(false);
  };

  // ─── STATUS ───────────────────────────────────────────
  const checkStatus = async (instance: Instance) => {
    try {
      let connected = false;

      if (instance.provider === "z-api") {
        if (!instance.instance_id || !instance.token) return;
        const { data, error } = await supabase.functions.invoke("zapi-proxy", {
          body: {
            action: "status",
            instanceId: instance.instance_id,
            token: instance.token,
            clientToken: instance.client_token,
          },
        });
        if (error) throw error;
        connected = data?.data?.connected === true;
      } else {
        if (!instance.instance_id) return;
        const { data, error } = await supabase.functions.invoke("evolution-proxy", {
          body: { action: "status", instanceName: instance.instance_id },
        });
        if (error) throw error;
        const state = data?.data?.instance?.state;
        connected = state === "open";
      }

      const newStatus = connected ? "connected" : "disconnected";
      await supabase.from("instances").update({ status: newStatus }).eq("id", instance.id);
      fetchInstances();
      toast({ title: connected ? "Conectado!" : "Desconectado", description: `Status: ${newStatus}` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // ─── DELETE ───────────────────────────────────────────
  const removeInstance = async (instance: Instance) => {
    if (instance.provider === "evolution" && instance.instance_id) {
      try {
        await supabase.functions.invoke("evolution-proxy", {
          body: { action: "delete-instance", instanceName: instance.instance_id },
        });
      } catch { /* ignore */ }
    }
    await supabase.from("instances").delete().eq("id", instance.id);
    fetchInstances();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie instâncias via Evolution API (grátis) ou Z-API (botões)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-green text-primary-foreground font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Criar Nova Instância</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-foreground">Provedor</Label>
                <Select value={newProvider} onValueChange={(v) => setNewProvider(v as "evolution" | "z-api")}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="evolution">
                      Evolution API (Grátis - VPS própria)
                    </SelectItem>
                    <SelectItem value="z-api">
                      Z-API (Pago - Suporta Botões)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground">Nome da Instância</Label>
                <Input
                  placeholder="Ex: WhatsApp Marketing"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              {newProvider === "z-api" && (
                <>
                  <div>
                    <Label className="text-foreground">Instance ID (Z-API)</Label>
                    <Input
                      placeholder="Ex: 3C2A7F9B1E..."
                      value={zapiInstanceId}
                      onChange={(e) => setZapiInstanceId(e.target.value)}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Token (Z-API)</Label>
                    <Input
                      type="password"
                      placeholder="Seu token Z-API"
                      value={zapiToken}
                      onChange={(e) => setZapiToken(e.target.value)}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Client Token (opcional)</Label>
                    <Input
                      type="password"
                      placeholder="Client token se tiver"
                      value={zapiClientToken}
                      onChange={(e) => setZapiClientToken(e.target.value)}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Z-API suporta envio de botões nativos do WhatsApp. Obtenha suas credenciais em z-api.io
                  </p>
                </>
              )}

              {newProvider === "evolution" && (
                <p className="text-xs text-muted-foreground">
                  💡 Evolution API é gratuita e roda na sua VPS. A instância será criada automaticamente.
                </p>
              )}

              <Button onClick={addInstance} className="w-full gradient-green text-primary-foreground font-semibold">
                Criar Instância
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Escanear QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{qrStatus || "Gerando QR Code..."}</p>
              </div>
            ) : qrImage ? (
              <img src={qrImage} alt="QR Code WhatsApp" className="rounded-lg" style={{ maxWidth: 300 }} />
            ) : (
              <p className="text-muted-foreground">Nenhum QR Code disponível</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Abra o WhatsApp → Configurações → Aparelhos conectados → Escanear QR Code
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {instances.map((instance) => (
            <motion.div key={instance.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${instance.status === "connected" ? "bg-primary/10" : "bg-muted"}`}>
                    <Smartphone className={`h-5 w-5 ${instance.status === "connected" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{instance.name}</p>
                    <p className="text-xs text-muted-foreground">{instance.phone || "Não conectado"}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${instance.status === "connected" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {instance.status === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {instance.status === "connected" ? "Online" : "Offline"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Enviadas: </span>
                  <span className="font-semibold text-foreground">{instance.messages_sent.toLocaleString()}</span>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${instance.provider === "z-api" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {instance.provider === "z-api" ? "Z-API" : "Evolution"}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 border-border text-foreground" onClick={() => getQrCode(instance)}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR Code
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-border text-foreground" onClick={() => checkStatus(instance)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Status
                </Button>
                <Button variant="outline" size="sm" className="border-border text-destructive hover:bg-destructive/10" onClick={() => removeInstance(instance)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {instances.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Smartphone className="mb-3 h-10 w-10" />
            <p className="text-lg font-medium">Nenhuma instância</p>
            <p className="text-sm">Crie sua primeira instância para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Instances;
