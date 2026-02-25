import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Smartphone, QrCode, Trash2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Instance {
  id: string;
  name: string;
  phone: string;
  status: "connected" | "disconnected" | "connecting";
  provider: string;
  messagesSent: number;
}

const Instances = () => {
  const [instances, setInstances] = useState<Instance[]>([
    { id: "1", name: "WhatsApp Principal", phone: "+55 11 99999-1234", status: "connected", provider: "z-api", messagesSent: 1250 },
    { id: "2", name: "WhatsApp Vendas", phone: "+55 21 98888-5678", status: "connected", provider: "z-api", messagesSent: 830 },
    { id: "3", name: "WhatsApp Suporte", phone: "+55 31 97777-9012", status: "disconnected", provider: "evolution", messagesSent: 420 },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState("z-api");
  const [newApiKey, setNewApiKey] = useState("");

  const addInstance = () => {
    if (!newName) return;
    const instance: Instance = {
      id: Date.now().toString(),
      name: newName,
      phone: "Aguardando QR Code...",
      status: "connecting",
      provider: newProvider,
      messagesSent: 0,
    };
    setInstances((prev) => [...prev, instance]);
    setNewName("");
    setNewApiKey("");
    setDialogOpen(false);
  };

  const removeInstance = (id: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleConnection = (id: string) => {
    setInstances((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: i.status === "connected" ? "disconnected" : "connected" }
          : i
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground">Conecte e gerencie múltiplos números</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-green text-primary-foreground font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Adicionar Instância</DialogTitle>
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
              </div>
              <div>
                <Label className="text-foreground">Provedor API</Label>
                <Select value={newProvider} onValueChange={setNewProvider}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="z-api">Z-API</SelectItem>
                    <SelectItem value="evolution">Evolution API</SelectItem>
                    <SelectItem value="codechat">CodeChat</SelectItem>
                    <SelectItem value="baileys">Baileys (Self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">API Key / Token</Label>
                <Input
                  placeholder="Cole sua chave da API aqui"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                  type="password"
                />
              </div>
              <Button onClick={addInstance} className="w-full gradient-green text-primary-foreground font-semibold">
                Conectar via QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {instances.map((instance) => (
            <motion.div
              key={instance.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    instance.status === "connected" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Smartphone className={`h-5 w-5 ${
                      instance.status === "connected" ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{instance.name}</p>
                    <p className="text-xs text-muted-foreground">{instance.phone}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  instance.status === "connected"
                    ? "bg-primary/10 text-primary"
                    : instance.status === "connecting"
                    ? "bg-warning/10 text-warning"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {instance.status === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {instance.status === "connected" ? "Online" : instance.status === "connecting" ? "Conectando..." : "Offline"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Enviadas: </span>
                  <span className="font-semibold text-foreground">{instance.messagesSent.toLocaleString()}</span>
                </div>
                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {instance.provider}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                {instance.status === "connecting" ? (
                  <Button variant="outline" size="sm" className="flex-1 border-border text-foreground">
                    <QrCode className="mr-1.5 h-3.5 w-3.5" /> Escanear QR
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border text-foreground"
                    onClick={() => toggleConnection(instance.id)}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {instance.status === "connected" ? "Desconectar" : "Reconectar"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-destructive hover:bg-destructive/10"
                  onClick={() => removeInstance(instance.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Instances;
