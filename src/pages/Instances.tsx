import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Smartphone, QrCode, Trash2, RefreshCw, Wifi, WifiOff,
  Loader2, AlertCircle, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

interface QrDialogBodyProps {
  qrLoading: boolean;
  qrStatus: string;
  qrImage: string | null;
  pairingCode: string | null;
  onVerify: () => void;
  onCopyCode: () => void;
}

const QrDialogBody = ({ qrLoading, qrStatus, qrImage, pairingCode, onVerify, onCopyCode }: QrDialogBodyProps) => {
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
            "Vá em Configurações (ícone da engrenagem)",
            <span key="dev">Toque em <strong className="text-foreground">"Aparelhos conectados"</strong></span>,
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
        <Button className="w-full gradient-blue text-primary-foreground font-semibold" onClick={onVerify}>
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
        <Button className="w-full gradient-blue text-primary-foreground font-semibold" onClick={onVerify}>
          <Wifi className="mr-2 h-4 w-4" /> Já pareei — verificar conexão
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
      <AlertCircle className="h-10 w-10" />
      <p className="text-sm text-center">Nenhum QR Code disponível.<br />Tente novamente.</p>
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
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Instance | null>(null);
  const pollingRef = useRef(false);
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

  // Auto-poll connection status while QR dialog is open
  useEffect(() => {
    if (!qrDialogOpen || !activeQrInstance) return;
    const interval = window.setInterval(async () => {
      try {
        const inst = activeQrInstance;
        const { data } = await supabase.functions.invoke("baileys-proxy", {
          body: { action: "status", instanceName: inst.instance_id },
        });
        console.log("Auto-poll response:", JSON.stringify(data));
        const isConnected = data?.data?.status === "connected";
        const phone: string | null = data?.data?.phone || null;
        if (isConnected) {
          const updateData: Record<string, any> = { status: "connected" };
          if (phone) updateData.phone = phone;
          await supabase.from("instances").update(updateData).eq("id", inst.id);
          toast({ title: "✅ Conectado!", description: "WhatsApp conectado com sucesso!" });
          setQrDialogOpen(false);
          setQrImage(null);
          setPairingCode(null);
          setActiveQrInstance(null);
          fetchInstances();
        }
      } catch { /* silent */ }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [qrDialogOpen, activeQrInstance]);

  const addInstance = async () => {
    if (!newName.trim()) {
      toast({ title: "Erro", description: "Preencha o nome da instância", variant: "destructive" });
      return;
    }
    try {
      const instanceName = newName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { data: createData, error: createError } = await supabase.functions.invoke("baileys-proxy", {
        body: { action: "create-instance", instanceName },
      });
      if (createError) throw createError;
      if (!createData?.success) throw new Error(createData?.error || "Erro ao criar instância");
      await supabase.from("instances").insert({
        user_id: user!.id,
        name: newName.trim(),
        provider: "baileys",
        instance_id: instanceName,
        status: "disconnected",
      });
      toast({ title: "Instância criada!", description: "Clique em QR Code para conectar." });
      const qrBase64 = createData?.data?.qrBase64 || createData?.data?.qrcode?.base64;
      if (qrBase64) {
        setQrImage(qrBase64.startsWith("data:image") ? qrBase64 : `data:image/png;base64,${qrBase64}`);
        // Set activeQrInstance for polling
        const { data: newInstances } = await supabase.from("instances").select("*").eq("instance_id", instanceName).single();
        if (newInstances) setActiveQrInstance(newInstances);
        setQrDialogOpen(true);
      }
      setNewName("");
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
      await getQrCodeBaileys(instance);
    } catch (error: any) {
      toast({ title: "Erro ao gerar QR", description: error.message, variant: "destructive" });
      setQrDialogOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const getQrCodeBaileys = async (instance: Instance) => {
    if (!instance.instance_id) throw new Error("Instance ID não configurado");

    setQrStatus("Limpando sessão antiga...");
    try {
      await supabase.functions.invoke("baileys-proxy", {
        body: { action: "delete-instance", instanceName: instance.instance_id },
      });
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 1500));

    setQrStatus("Criando nova sessão...");
    const { data: createData, error: createError } = await supabase.functions.invoke("baileys-proxy", {
      body: { action: "create-instance", instanceName: instance.instance_id },
    });
    if (createError) throw createError;
    if (!createData?.success) throw new Error(createData?.error || "Erro ao criar instância");

    if (createData?.data?.status === "connected") {
      toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso!" });
      await supabase.from("instances").update({ status: "connected", phone: createData?.data?.phone }).eq("id", instance.id);
      fetchInstances(); setQrDialogOpen(false); setQrImage(null); return;
    }

    const qrBase64 = createData?.data?.qrBase64;
    if (qrBase64) {
      setQrImage(qrBase64.startsWith("data:image") ? qrBase64 : `data:image/png;base64,${qrBase64}`);
      pollConnectionStatus(instance);
      return;
    }

    setQrStatus("Aguardando QR...");
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      const { data, error } = await supabase.functions.invoke("baileys-proxy", {
        body: { action: "qr-code", instanceName: instance.instance_id },
      });
      if (error) throw error;
      if (data?.data?.status === "connected") {
        toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso!" });
        await supabase.from("instances").update({ status: "connected", phone: data?.data?.phone }).eq("id", instance.id);
        fetchInstances(); setQrDialogOpen(false); setQrImage(null); return;
      }
      const qr = data?.data?.qrBase64;
      if (qr) {
        setQrImage(qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);
        pollConnectionStatus(instance); return;
      }
      setQrStatus(`Aguardando QR... tentativa ${attempt + 1}/15`);
    }
    throw new Error("Não foi possível gerar o QR Code. Tente novamente em alguns segundos.");
  };

  const pollConnectionStatus = async (instance: Instance) => {
    pollingRef.current = true;
    for (let i = 0; i < 20; i++) {
      if (!pollingRef.current) return;
      await new Promise(r => setTimeout(r, 3000));
      try {
        const { data } = await supabase.functions.invoke("baileys-proxy", {
          body: { action: "status", instanceName: instance.instance_id },
        });
        if (data?.data?.status === "connected") {
          pollingRef.current = false;
          toast({ title: "✅ Conectado!", description: "WhatsApp conectado com sucesso!" });
          const phone = data?.data?.phone || null;
          const updateData: any = { status: "connected" };
          if (phone) updateData.phone = phone;
          await supabase.from("instances").update(updateData).eq("id", instance.id);
          setQrDialogOpen(false);
          setQrImage(null);
          setPairingCode(null);
          fetchInstances();
          return;
        }
      } catch (err) {
        console.log(`[polling] error on attempt ${i + 1}:`, err);
      }
    }
    pollingRef.current = false;
  };

  const checkStatus = async (instance: Instance) => {
    setVerifyingId(instance.id);
    try {
      if (!instance.instance_id) return;
      const { data, error } = await supabase.functions.invoke("baileys-proxy", {
        body: { action: "status", instanceName: instance.instance_id },
      });
      if (error) throw error;
      const connected = data?.data?.status === "connected";
      const phone = data?.data?.phone || null;
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
    pollingRef.current = false;
    setVerifyingId(activeQrInstance.id);
    setQrStatus("Verificando conexão...");
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          setQrStatus(`Verificando... tentativa ${attempt + 1}/5`);
          await new Promise(r => setTimeout(r, 2000));
        }
        try {
          const { data } = await supabase.functions.invoke("baileys-proxy", {
            body: { action: "status", instanceName: activeQrInstance.instance_id },
          });
          console.log("Verify response:", JSON.stringify(data));
          const connected = data?.data?.status === "connected";
          const phone = data?.data?.phone || null;
          if (connected) {
            const updateData: any = { status: "connected" };
            if (phone) updateData.phone = phone;
            await supabase.from("instances").update(updateData).eq("id", activeQrInstance.id);
            setQrDialogOpen(false);
            setQrImage(null);
            setPairingCode(null);
            setQrStatus("");
            fetchInstances();
            toast({ title: "✅ WhatsApp conectado com sucesso!" });
            return;
          }
        } catch (networkError) {
          console.error(`[verify attempt ${attempt + 1}] Network error:`, networkError);
          continue;
        }
      }
      const { data: lastCheck } = await supabase.functions.invoke("baileys-proxy", {
        body: { action: "status", instanceName: activeQrInstance.instance_id },
      });
      toast({
        title: "Ainda não conectado",
        description: `Resposta: ${JSON.stringify(lastCheck?.data || lastCheck?.error || 'sem dados')}. Escaneie o QR e clique novamente.`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({ title: "Erro ao verificar", description: error.message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
      setQrStatus("");
    }
  };

  const removeInstance = async (instance: Instance) => {
    if (instance.instance_id) {
      try {
        await supabase.functions.invoke("baileys-proxy", {
          body: { action: "delete-instance", instanceName: instance.instance_id },
        });
      } catch (e) {
        console.log("Erro ao desconectar no servidor (ignorado):", e);
      }
    }

    try {
      await supabase.from("campaign_jobs").update({ instance_id: null }).eq("instance_id", instance.id);
      await supabase.from("campaign_logs").update({ instance_id: null }).eq("instance_id", instance.id);

      const { error: delError } = await supabase
        .from("instances")
        .delete()
        .eq("id", instance.id);
      if (delError) {
        console.error("Erro ao deletar do banco:", delError);
        await supabase.from("instances").update({ status: "deleted" }).eq("id", instance.id);
        toast({ title: "Instância marcada para remoção", description: "Será removida automaticamente." });
      } else {
        toast({ title: "Instância removida", description: `"${instance.name}" foi deletada.` });
      }
    } catch (error: any) {
      console.error("Erro ao remover do banco:", error);
      toast({ title: "Erro ao remover", description: "Detalhes: " + (error?.message || "desconhecido"), variant: "destructive" });
    }
    await fetchInstances();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 md:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', color: '#f2f2ff' }}>Instâncias WhatsApp</h1>
          <p style={{ fontSize: 12, color: 'rgba(242,242,255,0.28)' }}>Gerencie suas conexões de WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          {instances.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11 }}
              className="hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm("Tem certeza que deseja remover TODAS as instâncias?")) return;
                for (const inst of instances) {
                  if (inst.instance_id) {
                    try {
                      await supabase.functions.invoke("baileys-proxy", {
                        body: { action: "delete-instance", instanceName: inst.instance_id },
                      });
                    } catch {}
                  }
                }
                const { error } = await supabase
                  .from("instances")
                  .delete()
                  .neq("id", "00000000-0000-0000-0000-000000000000");
                if (error) {
                  for (const inst of instances) {
                    await supabase.from("instances").delete().eq("id", inst.id);
                  }
                }
                toast({ title: "Todas as instâncias removidas" });
                await fetchInstances();
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Limpar Tudo
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-blue text-primary-foreground font-semibold">
                <Plus className="mr-2 h-4 w-4" /> Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">Criar Nova Instância</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-foreground">Nome da Instância</Label>
                  <Input placeholder="Ex: WhatsApp Marketing" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                  ✅ Pronto para usar. Basta criar a instância e escanear o QR Code pelo WhatsApp.
                </div>
                <Button onClick={addInstance} className="w-full gradient-blue text-primary-foreground font-semibold" disabled={!newName.trim()}>
                  Criar Instância
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={(open) => { setQrDialogOpen(open); if (!open) pollingRef.current = false; }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Escanear QR Code
            </DialogTitle>
          </DialogHeader>
          <QrDialogBody
            qrLoading={qrLoading}
            qrStatus={qrStatus}
            qrImage={qrImage}
            pairingCode={pairingCode}
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
            <motion.div key={instance.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-[10px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: instance.status === 'connected' ? 'rgba(24,242,106,0.08)' : 'rgba(255,255,255,0.04)' }}>
                    <Smartphone className="h-5 w-5" style={{ color: instance.status === 'connected' ? '#18f26a' : 'rgba(242,242,255,0.3)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f2f2ff', letterSpacing: '-0.02em' }}>{instance.name}</p>
                    <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(242,242,255,0.5)' }}>{instance.phone || "Não conectado"}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-[10px]" style={{
                  padding: '2px 8px',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                  ...(instance.status === 'connected'
                    ? { background: 'rgba(24,242,106,0.08)', color: '#18f26a', border: '1px solid rgba(24,242,106,0.12)' }
                    : { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.12)' }),
                }}>
                  {instance.status === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {instance.status === "connected" ? "Online" : "Offline"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Enviadas: </span>
                  <span className="font-semibold text-foreground">{(instance.messages_sent || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1 gradient-blue text-primary-foreground" style={{ fontSize: 11, fontWeight: 600 }} onClick={() => getQrCode(instance)} disabled={instance.status === "connected"}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  {instance.status === "connected" ? "Conectado" : "QR Code"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-border text-foreground" style={{ fontSize: 11 }} onClick={() => checkStatus(instance)} disabled={verifyingId === instance.id}>
                  {verifyingId === instance.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  Status
                </Button>
                <Button variant="outline" size="sm" style={{ fontSize: 11, border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }} className="hover:bg-destructive/10" onClick={() => setDeleteTarget(instance)}>
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
            <Button className="gradient-blue text-primary-foreground font-semibold" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar primeira instância
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover instância</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a instância <strong>&quot;{deleteTarget?.name}&quot;</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) { removeInstance(deleteTarget); setDeleteTarget(null); } }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Instances;
