import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Smartphone, QrCode, Trash2, RefreshCw, Wifi, WifiOff,
  Loader2, CheckCircle, ExternalLink, Copy, ChevronRight, AlertCircle, Info,
} from "lucide-react";
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

const ZapiGuide = () => (
  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
      <p className="text-sm font-medium text-blue-400">Como obter suas credenciais Z-API</p>
    </div>
    <ol className="space-y-2 pl-1">
      {[
        <span key={0}>Acesse <a href="https://z-api.io" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">z-api.io <ExternalLink className="h-3 w-3" /></a> e faça login</span>,
        <span key={1}>No painel, clique em <strong className="text-foreground">"Criar Instância"</strong></span>,
        <span key={2}>Copie o <strong className="text-foreground">Instance ID</strong> e o <strong className="text-foreground">Token</strong> da instância criada</span>,
        <span key={3}>Cole os dados abaixo e clique em <strong className="text-foreground">"Adicionar Instância"</strong></span>,
        <span key={4}>Depois clique em <strong className="text-foreground">"QR Code"</strong> e escaneie pelo WhatsApp</span>,
      ].map((step, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground list-none">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">{i + 1}</span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  </div>
);

interface QrDialogBodyProps {
  qrLoading: boolean;
  qrStatus: string;
  qrImage: string | null;
  pairingCode: string | null;
  provider: string;
  onVerify: () => void;
  onCopyCode: () => void;
}

const QrDialogBody = ({ qrLoading, qrStatus, qrImage, pairingCode, provider, onVerify, onCopyCode }: QrDialogBodyProps) => {
  if (qrLoading && !qrImage && !pairingCode) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{qrStatus || "Gerando QR Code..."}</p>
      </div>
    );
  }

  if (qrImage) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="rounded-xl border border-border bg-white p-3">
            <img src={qrImage} alt="QR Code WhatsApp" className="rounded-lg" style={{ width: 240, height: 240, objectFit: "contain" }} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Como escanear</p>
          {[
            "Abra o WhatsApp no seu celular",
            provider === "z-api" ? "Toque nos 3 pontos (⋮) no canto superior direito" : "Vá em Configurações (ícone da engrenagem)",
            provider === "z-api" ? <span key="zapi">Selecione <strong className="text-foreground">"Dispositivos conectados"</strong></span> : <span key="other">Toque em <strong className="text-foreground">"Aparelhos conectados"</strong></span>,
            <span key="scan">Toque em <strong className="text-foreground">"Conectar aparelho"</strong> e escaneie o QR acima</span>,
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Aguardando conexão... o QR expira em ~30 segundos</span>
        </div>
        <Button className="w-full gradient-green text-primary-foreground font-semibold" onClick={onVerify}>
          <Wifi className="mr-2 h-4 w-4" /> Já escaneei — verificar conexão
        </Button>
      </div>
    );
  }

  if (pairingCode) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-secondary p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Código de pareamento</p>
          <p className="text-3xl font-bold tracking-[0.25em] text-foreground font-mono">{pairingCode}</p>
          <button onClick={onCopyCode} className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-primary hover:underline">
            <Copy className="h-3 w-3" /> Copiar código
          </button>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Como usar</p>
          {[
            "Abra o WhatsApp → Configurações → Aparelhos conectados",
            <span key="pair">Toque em <strong className="text-foreground">"Conectar com número de telefone"</strong></span>,
            "Digite o código acima quando solicitado",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <Button className="w-full gradient-green text-primary-foreground font-semibold" onClick={onVerify}>
          <Wifi className="mr-2 h-4 w-4" /> Já pareei — verificar conexão
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
      <AlertCircle className="h-10 w-10" />
      <p className="text-sm text-center">Nenhum QR Code disponível.<br />Verifique suas credenciais e tente novamente.</p>
    </div>
  );
};

const Instances = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState("");
  const [activeQrInstance, setActiveQrInstance] = useState<Instance | null>(null);
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState<"baileys" | "z-api">("z-api");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [zapiClientToken, setZapiClientToken] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
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

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const getProxyFunction = (provider: string) => {
    if (provider === "baileys") return "baileys-proxy";
    if (provider === "z-api") return "zapi-proxy";
    return "evolution-proxy";
  };

  const parseZapiConnected = (data: any): boolean => {
    return (
      data?.data?.connected === true ||
      data?.data?.value?.isConnected === true ||
      data?.data?.value?.connected === true ||
      data?.data?.isConnected === true
    );
  };

  const addInstance = async () => {
    if (!newName.trim()) {
      toast({ title: "Erro", description: "Preencha o nome da instância", variant: "destructive" });
      return;
    }
    try {
      if (newProvider === "baileys") {
        const instanceName = newName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const proxyFn = getProxyFunction(newProvider);
        const { data: createData, error: createError } = await supabase.functions.invoke(proxyFn, {
          body: { action: "create-instance", instanceName },
        });
        if (createError) throw createError;
        if (!createData?.success) throw new Error(createData?.error || "Erro ao criar instância");
        await supabase.from("instances").insert({
          user_id: user!.id,
          name: newName.trim(),
          provider: newProvider,
          instance_id: instanceName,
          status: "disconnected",
        });
        toast({ title: "Instância criada!", description: "Clique em QR Code para conectar." });
        const qrBase64 = createData?.data?.qrBase64 || createData?.data?.qrcode?.base64;
        if (qrBase64) {
          setQrImage(qrBase64.startsWith("data:image") ? qrBase64 : `data:image/png;base64,${qrBase64}`);
          setQrDialogOpen(true);
        }
      } else {
        if (!zapiInstanceId.trim() || !zapiToken.trim()) {
          toast({ title: "Erro", description: "Preencha Instance ID e Token da Z-API", variant: "destructive" });
          return;
        }
        const { error: insertError } = await supabase.from("instances").insert({
          user_id: user!.id,
          name: newName.trim(),
          provider: "z-api",
          instance_id: zapiInstanceId.trim(),
          token: zapiToken.trim(),
          client_token: zapiClientToken.trim() || null,
          status: "disconnected",
        });
        if (insertError) throw insertError;
        toast({ title: "Instância Z-API adicionada!", description: "Clique em QR Code para conectar." });
      }
      setNewName(""); setZapiInstanceId(""); setZapiToken(""); setZapiClientToken("");
      setDialogOpen(false);
      fetchInstances();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getQrCode = async (instance: Instance) => {
    setQrLoading(true);
    setQrDialogOpen(true);
    setQrImage(null);
    setPairingCode(null);
    setQrStatus("Conectando...");
    setActiveQrInstance(instance);
    try {
      if (instance.provider === "z-api") {
        await getQrCodeZapi(instance);
      } else if (instance.provider === "baileys") {
        await getQrCodeBaileys(instance);
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
    if (!instance.instance_id || !instance.token) throw new Error("Instance ID ou Token não configurados");
    setQrStatus("Verificando se já está conectado...");
    const { data: statusData } = await supabase.functions.invoke("zapi-proxy", {
      body: { action: "status", instanceId: instance.instance_id, token: instance.token, clientToken: instance.client_token },
    });
    if (parseZapiConnected(statusData)) {
      toast({ title: "Já conectado!", description: "Esta instância Z-API já está conectada ao WhatsApp." });
      await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
      fetchInstances();
      setQrDialogOpen(false);
      return;
    }
    setQrStatus("Gerando QR Code...");
    const { data, error } = await supabase.functions.invoke("zapi-proxy", {
      body: { action: "qr-code", instanceId: instance.instance_id, token: instance.token, clientToken: instance.client_token },
    });
    if (error) throw new Error(error.message);
    const qr = data?.data?.base64 || data?.data?.value;
    if (qr) {
      setQrImage(qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);
      pollZapiConnection(instance);
    } else {
      throw new Error("QR Code não disponível. Verifique se a instância existe no painel da Z-API e tente novamente.");
    }
  };

  const pollZapiConnection = async (instance: Instance) => {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const { data } = await supabase.functions.invoke("zapi-proxy", {
          body: { action: "status", instanceId: instance.instance_id, token: instance.token, clientToken: instance.client_token },
        });
        if (parseZapiConnected(data)) {
          toast({ title: "✅ Conectado!", description: "WhatsApp Z-API conectado com sucesso!" });
          await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
          fetchInstances();
          setQrDialogOpen(false);
          return;
        }
      } catch { /* continue */ }
    }
  };

  const getQrCodeBaileys = async (instance: Instance) => {
    if (!instance.instance_id) throw new Error("Instance ID não configurado");
    setQrStatus("Verificando status...");
    const { data: statusData } = await supabase.functions.invoke("baileys-proxy", {
      body: { action: "status", instanceName: instance.instance_id },
    });
    if (statusData?.data?.status === "connected") {
      toast({ title: "Já conectado!", description: "Esta instância já está conectada ao WhatsApp." });
      await supabase.from("instances").update({ status: "connected", phone: statusData?.data?.phone }).eq("id", instance.id);
      fetchInstances(); setQrDialogOpen(false); return;
    }
    setQrStatus("Gerando QR Code...");
    for (let attempt = 0; attempt < 15; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
      const { data, error } = await supabase.functions.invoke("baileys-proxy", {
        body: { action: "qr-code", instanceName: instance.instance_id },
      });
      if (error) throw error;
      if (data?.data?.status === "connected") {
        toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso!" });
        await supabase.from("instances").update({ status: "connected", phone: data?.data?.phone }).eq("id", instance.id);
        fetchInstances(); setQrDialogOpen(false); return;
      }
      const qrBase64 = data?.data?.qrBase64;
      if (qrBase64) {
        setQrImage(qrBase64.startsWith("data:image") ? qrBase64 : `data:image/png;base64,${qrBase64}`);
        pollConnectionStatus(instance, "baileys"); return;
      }
      setQrStatus(`Aguardando QR... tentativa ${attempt + 1}/15`);
    }
    throw new Error("Servidor Disparo Pro não retornou QR. Verifique se está rodando na VPS (porta 3100).");
  };

  const pollConnectionStatus = async (instance: Instance, provider: string) => {
    const proxyFn = getProxyFunction(provider);
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const { data } = await supabase.functions.invoke(proxyFn, {
          body: { action: "status", instanceName: instance.instance_id },
        });
        const status = provider === "baileys" ? data?.data?.status : data?.data?.instance?.state;
        if (status === "connected" || status === "open") {
          toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso!" });
          const phone = data?.data?.phone || null;
          const updateData: any = { status: "connected" };
          if (phone) updateData.phone = phone;
          await supabase.from("instances").update(updateData).eq("id", instance.id);
          fetchInstances(); setQrDialogOpen(false); return;
        }
      } catch { /* continue */ }
    }
  };

  const extractQrImage = (payload: any) => {
    const rawQr = payload?.data?.base64 ?? payload?.data?.code ?? payload?.data?.qrcode?.base64 ?? payload?.data?.qrcode?.code ?? payload?.data?.instance?.qrcode?.base64;
    if (!rawQr || typeof rawQr !== "string") return null;
    if (rawQr.startsWith("data:image")) return rawQr;
    if (rawQr.length < 100) return null;
    return `data:image/png;base64,${rawQr}`;
  };

  const extractPairingCode = (payload: any) => {
    const rawCode = payload?.data?.pairingCode;
    if (!rawCode || typeof rawCode !== "string") return null;
    return rawCode.trim() || null;
  };

  const getQrCodeEvolution = async (instance: Instance) => {
    if (!instance.instance_id) throw new Error("Instance ID não configurado");
    setQrStatus("Verificando status...");
    const { data: statusData } = await supabase.functions.invoke("evolution-proxy", {
      body: { action: "status", instanceName: instance.instance_id },
    });
    const state = statusData?.data?.instance?.state ?? statusData?.data?.state;
    if (state === "open") {
      toast({ title: "Já conectado!" }); await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
      fetchInstances(); setQrDialogOpen(false); return;
    }
    if (state === "connecting" || !statusData?.success || statusData?.error === "not_found") {
      setQrStatus("Reiniciando instância...");
      try { await supabase.functions.invoke("evolution-proxy", { body: { action: "delete-instance", instanceName: instance.instance_id } }); } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 2000));
      setQrStatus("Criando nova sessão...");
      const { data: createData } = await supabase.functions.invoke("evolution-proxy", { body: { action: "create-instance", instanceName: instance.instance_id } });
      const qrFromCreate = extractQrImage(createData);
      if (qrFromCreate) { setQrImage(qrFromCreate); return; }
      const pairingFromCreate = extractPairingCode(createData);
      if (pairingFromCreate) { setPairingCode(pairingFromCreate); return; }
    }
    setQrStatus("Aguardando QR...");
    await new Promise((r) => setTimeout(r, 4000));
    for (let attempt = 0; attempt < 25; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2500));
      const { data, error } = await supabase.functions.invoke("evolution-proxy", { body: { action: "qr-code", instanceName: instance.instance_id } });
      if (error) throw error;
      const qrImageData = extractQrImage(data);
      if (qrImageData) { setQrImage(qrImageData); return; }
      const pairing = extractPairingCode(data);
      if (pairing) { setPairingCode(pairing); return; }
      const s = data?.data?.instance?.state ?? data?.data?.state;
      if (s === "open") {
        toast({ title: "Conectado!" }); await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
        fetchInstances(); setQrDialogOpen(false); return;
      }
      setQrStatus(`Aguardando QR... tentativa ${attempt + 1}/25`);
    }
    throw new Error("A sessão ainda não retornou QR. Tente novamente em 30s.");
  };

  const checkStatus = async (instance: Instance) => {
    setVerifyingId(instance.id);
    try {
      let connected = false;
      let phone: string | null = null;
      if (instance.provider === "z-api") {
        if (!instance.instance_id || !instance.token) return;
        const { data, error } = await supabase.functions.invoke("zapi-proxy", {
          body: { action: "status", instanceId: instance.instance_id, token: instance.token, clientToken: instance.client_token },
        });
        if (error) throw error;
        connected = parseZapiConnected(data);
      } else if (instance.provider === "baileys") {
        if (!instance.instance_id) return;
        const { data, error } = await supabase.functions.invoke("baileys-proxy", { body: { action: "status", instanceName: instance.instance_id } });
        if (error) throw error;
        connected = data?.data?.status === "connected";
        phone = data?.data?.phone || null;
      } else {
        if (!instance.instance_id) return;
        const { data, error } = await supabase.functions.invoke("evolution-proxy", { body: { action: "status", instanceName: instance.instance_id } });
        if (error) throw error;
        connected = data?.data?.instance?.state === "open";
      }
      const newStatus = connected ? "connected" : "disconnected";
      const updateData: any = { status: newStatus };
      if (phone) updateData.phone = phone;
      await supabase.from("instances").update(updateData).eq("id", instance.id);
      fetchInstances();
      toast({
        title: connected ? "✅ Conectado" : "❌ Desconectado",
        description: connected ? "Instância online e pronta para enviar." : "Instância não está conectada ao WhatsApp.",
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAfterQr = async () => {
    if (!activeQrInstance) return;
    setQrDialogOpen(false);
    await checkStatus(activeQrInstance);
  };

  const removeInstance = async (instance: Instance) => {
    if ((instance.provider === "evolution" || instance.provider === "baileys") && instance.instance_id) {
      try {
        const proxyFn = getProxyFunction(instance.provider);
        await supabase.functions.invoke(proxyFn, { body: { action: "delete-instance", instanceName: instance.instance_id } });
      } catch { /* ignore */ }
    }
    const { error: delError } = await supabase.from("instances").delete().eq("id", instance.id);
    if (delError) {
      toast({ title: "Erro ao remover", description: delError.message, variant: "destructive" });
      return;
    }
    await fetchInstances();
    toast({ title: "Instância removida", description: `"${instance.name}" foi deletada.` });
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "baileys": return "Disparo Pro";
      case "z-api": return "Z-API";
      default: return provider;
    }
  };

  const getProviderBadgeClass = (provider: string) => {
    switch (provider) {
      case "baileys": return "bg-orange-500/10 text-orange-400";
      case "z-api": return "bg-blue-500/10 text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas conexões de WhatsApp</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-green text-primary-foreground font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">Criar Nova Instância</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-foreground">Provedor</Label>
                <Select value={newProvider} onValueChange={(v) => setNewProvider(v as "baileys" | "z-api")}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="z-api">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-xs bg-blue-500/10 text-blue-400 font-medium">Z-API</span>
                        <span>Com botões clicáveis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="baileys">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-xs bg-orange-500/10 text-orange-400 font-medium">Disparo Pro</span>
                        <span>Envio de texto</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Nome da Instância</Label>
                <Input placeholder="Ex: WhatsApp Marketing" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border text-foreground" />
              </div>
              {newProvider === "z-api" && (
                <>
                  <ZapiGuide />
                  <div>
                    <Label className="text-foreground">Instance ID <span className="text-destructive">*</span></Label>
                    <Input placeholder="Ex: 3C2A7F9B1E4D5F6A..." value={zapiInstanceId} onChange={(e) => setZapiInstanceId(e.target.value)} className="bg-secondary border-border text-foreground font-mono text-sm" />
                  </div>
                  <div>
                    <Label className="text-foreground">Token <span className="text-destructive">*</span></Label>
                    <Input type="password" placeholder="Seu token Z-API" value={zapiToken} onChange={(e) => setZapiToken(e.target.value)} className="bg-secondary border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Client Token <span className="ml-1.5 text-xs text-muted-foreground">(opcional — plano Business)</span></Label>
                    <Input type="password" placeholder="Client token se tiver" value={zapiClientToken} onChange={(e) => setZapiClientToken(e.target.value)} className="bg-secondary border-border text-foreground" />
                  </div>
                </>
              )}
              {newProvider === "baileys" && (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-sm text-muted-foreground">
                  ✅ Pronto para usar. Basta criar a instância e escanear o QR Code pelo WhatsApp.
                </div>
              )}
              <Button onClick={addInstance} className="w-full gradient-green text-primary-foreground font-semibold" disabled={!newName.trim() || (newProvider === "z-api" && (!zapiInstanceId.trim() || !zapiToken.trim()))}>
                <ChevronRight className="mr-2 h-4 w-4" />
                {newProvider === "z-api" ? "Adicionar Instância Z-API" : "Criar Instância"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              {activeQrInstance?.provider === "z-api" ? "Conectar Z-API" : "Escanear QR Code"}
            </DialogTitle>
          </DialogHeader>
          <QrDialogBody
            qrLoading={qrLoading}
            qrStatus={qrStatus}
            qrImage={qrImage}
            pairingCode={pairingCode}
            provider={activeQrInstance?.provider || ""}
            onVerify={handleVerifyAfterQr}
            onCopyCode={() => {
              if (pairingCode) { navigator.clipboard.writeText(pairingCode); toast({ title: "Código copiado!" }); }
            }}
          />
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
                  <span className="font-semibold text-foreground">{(instance.messages_sent || 0).toLocaleString()}</span>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${getProviderBadgeClass(instance.provider)}`}>
                  {getProviderLabel(instance.provider)}
                </span>
              </div>
              {instance.provider === "z-api" && instance.status === "connected" && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-500/5 px-3 py-1.5 text-xs text-blue-400 border border-blue-500/10">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Botões nativos habilitados nesta instância
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 border-border text-foreground" onClick={() => getQrCode(instance)} disabled={instance.status === "connected"}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  {instance.status === "connected" ? "Conectado" : "QR Code"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-border text-foreground" onClick={() => checkStatus(instance)} disabled={verifyingId === instance.id}>
                  {verifyingId === instance.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  Status
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
            <p className="text-lg font-medium">Nenhuma instância ainda</p>
            <p className="mb-4 text-sm">Crie sua primeira instância para começar a disparar</p>
            <Button className="gradient-green text-primary-foreground font-semibold" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar primeira instância
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Instances;