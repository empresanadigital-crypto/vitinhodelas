import { useState, useEffect } from "react";
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
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState("z-api");
  const [newInstanceId, setNewInstanceId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newClientToken, setNewClientToken] = useState("");
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
    if (!newName || !newInstanceId || !newToken) {
      toast({ title: "Erro", description: "Preencha nome, Instance ID e Token", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("instances").insert({
      user_id: user!.id,
      name: newName,
      provider: newProvider,
      instance_id: newInstanceId,
      token: newToken,
      client_token: newClientToken || null,
      status: "disconnected",
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Instância adicionada!" });
      setNewName("");
      setNewInstanceId("");
      setNewToken("");
      setNewClientToken("");
      setDialogOpen(false);
      fetchInstances();
    }
  };

  const getQrCode = async (instance: Instance) => {
    if (!instance.instance_id || !instance.token) {
      toast({ title: "Erro", description: "Instance ID ou Token não configurado", variant: "destructive" });
      return;
    }
    setQrLoading(true);
    setQrDialogOpen(true);
    setQrImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          action: "qr-code",
          instanceId: instance.instance_id,
          token: instance.token,
          clientToken: instance.client_token,
        },
      });
      if (error) throw error;
      if (data?.data?.value) {
        setQrImage(data.data.value);
      } else {
        toast({ title: "Info", description: "Instância já pode estar conectada. Verifique o status." });
        setQrDialogOpen(false);
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar QR", description: error.message, variant: "destructive" });
      setQrDialogOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const checkStatus = async (instance: Instance) => {
    if (!instance.instance_id || !instance.token) return;
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          action: "status",
          instanceId: instance.instance_id,
          token: instance.token,
          clientToken: instance.client_token,
        },
      });
      if (error) throw error;
      const connected = data?.data?.connected;
      const newStatus = connected ? "connected" : "disconnected";
      const phone = data?.data?.smartPhone || instance.phone;

      await supabase
        .from("instances")
        .update({ status: newStatus, phone })
        .eq("id", instance.id);

      fetchInstances();
      toast({ title: connected ? "Conectado!" : "Desconectado", description: `Status: ${newStatus}` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const removeInstance = async (id: string) => {
    await supabase.from("instances").delete().eq("id", id);
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
          <p className="text-muted-foreground">Conecte e gerencie múltiplos números via Z-API</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-green text-primary-foreground font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Adicionar Instância Z-API</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-foreground">Nome da Instância</Label>
                <Input placeholder="Ex: WhatsApp Marketing" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Provedor</Label>
                <Select value={newProvider} onValueChange={setNewProvider}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="z-api">Z-API</SelectItem>
                    <SelectItem value="evolution">Evolution API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Instance ID</Label>
                <Input placeholder="Cole o Instance ID da Z-API" value={newInstanceId} onChange={(e) => setNewInstanceId(e.target.value)} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Token</Label>
                <Input placeholder="Cole o Token da Z-API" value={newToken} onChange={(e) => setNewToken(e.target.value)} className="bg-secondary border-border text-foreground" type="password" />
              </div>
              <div>
                <Label className="text-foreground">Client Token (opcional)</Label>
                <Input placeholder="Security token para webhooks" value={newClientToken} onChange={(e) => setNewClientToken(e.target.value)} className="bg-secondary border-border text-foreground" type="password" />
              </div>
              <Button onClick={addInstance} className="w-full gradient-green text-primary-foreground font-semibold">
                Adicionar Instância
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
                <Button variant="outline" size="sm" className="border-border text-destructive hover:bg-destructive/10" onClick={() => removeInstance(instance.id)}>
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
            <p className="text-sm">Adicione sua primeira instância Z-API para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Instances;
