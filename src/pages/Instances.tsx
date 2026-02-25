import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Smartphone, QrCode, Trash2, RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [newName, setNewName] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInstances = async () => {
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
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const addInstance = async () => {
    if (!newName.trim()) {
      toast({ title: "Erro", description: "Preencha o nome da instância", variant: "destructive" });
      return;
    }

    // Sanitize name for Evolution API (no spaces, lowercase)
    const instanceName = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
      // Create instance on Evolution API
      const { data: evoData, error: evoError } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "create-instance", instanceName },
      });

      if (evoError) throw evoError;
      if (!evoData?.success) throw new Error(evoData?.error || "Erro ao criar instância");

      // Save to database
      const { error: dbError } = await supabase.from("instances").insert({
        user_id: user!.id,
        name: newName.trim(),
        provider: "evolution",
        instance_id: instanceName,
        status: "disconnected",
      });

      if (dbError) throw dbError;

      toast({ title: "Sucesso!", description: "Instância criada! Agora escaneie o QR Code para conectar." });
      setNewName("");
      setDialogOpen(false);
      fetchInstances();

      // If QR code came back in creation response, show it
      const qrBase64 = evoData?.data?.qrcode?.base64;
      if (qrBase64) {
        setQrImage(qrBase64);
        setQrDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getQrCode = async (instance: Instance) => {
    if (!instance.instance_id) {
      toast({ title: "Erro", description: "Instance ID não configurado", variant: "destructive" });
      return;
    }

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

    setQrLoading(true);
    setQrDialogOpen(true);
    setQrImage(null);

    try {
      // First, ensure the instance exists on Evolution (re-create if needed)
      const { data: statusData } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "status", instanceName: instance.instance_id },
      });

      const instanceExists = statusData?.success;

      if (!instanceExists) {
        // Instance doesn't exist on Evolution, re-create it
        const { data: createData, error: createError } = await supabase.functions.invoke("evolution-proxy", {
          body: { action: "create-instance", instanceName: instance.instance_id },
        });
        if (createError) throw createError;

        // Check if QR came with creation
        const qrFromCreate = extractQrImage(createData);
        if (qrFromCreate) {
          setQrImage(qrFromCreate);
          setQrLoading(false);
          return;
        }
      }

      // Poll for QR code
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const { data, error } = await supabase.functions.invoke("evolution-proxy", {
          body: { action: "qr-code", instanceName: instance.instance_id },
        });

        if (error) throw error;

        const qrImageData = extractQrImage(data);
        if (qrImageData) {
          setQrImage(qrImageData);
          return;
        }

        // Check if already connected
        const state = data?.data?.instance?.state ?? data?.data?.state;
        if (state === "open") {
          toast({ title: "Já conectado!", description: "Esta instância já está conectada ao WhatsApp." });
          await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id);
          fetchInstances();
          setQrDialogOpen(false);
          return;
        }
      }

      toast({
        title: "QR ainda não gerado",
        description: "A instância está inicializando. Aguarde 10 segundos e clique em QR Code novamente.",
      });
      setQrDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao gerar QR", description: error.message, variant: "destructive" });
      setQrDialogOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const checkStatus = async (instance: Instance) => {
    if (!instance.instance_id) return;
    try {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "status", instanceName: instance.instance_id },
      });
      if (error) throw error;

      const state = data?.data?.instance?.state;
      const connected = state === "open";
      const newStatus = connected ? "connected" : "disconnected";

      await supabase
        .from("instances")
        .update({ status: newStatus })
        .eq("id", instance.id);

      fetchInstances();
      toast({ title: connected ? "Conectado!" : "Desconectado", description: `Status: ${newStatus}` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const removeInstance = async (instance: Instance) => {
    // Try to delete from Evolution API too
    if (instance.instance_id) {
      try {
        await supabase.functions.invoke("evolution-proxy", {
          body: { action: "delete-instance", instanceName: instance.instance_id },
        });
      } catch (e) {
        // ignore - just delete from DB
      }
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
          <p className="text-muted-foreground">Conecte e gerencie múltiplos números via Evolution API</p>
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
                <Label className="text-foreground">Nome da Instância</Label>
                <Input
                  placeholder="Ex: WhatsApp Marketing"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  A instância será criada automaticamente na sua VPS
                </p>
              </div>
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
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : qrImage ? (
              <img src={qrImage} alt="QR Code WhatsApp" className="rounded-lg" style={{ maxWidth: 300 }} />
            ) : (
              <p className="text-muted-foreground">Nenhum QR Code disponível</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Escanear QR Code
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
                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{instance.provider}</span>
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
