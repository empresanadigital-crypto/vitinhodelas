import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Pause,
  Play,
  Clock,
  MessageSquare,
  Settings2,
  Zap,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[] | null;
}

const Campaigns = () => {
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [interval, setInterval] = useState([15]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [useButtons, setUseButtons] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [selectedInstance, setSelectedInstance] = useState("");
  const [rotateInstances, setRotateInstances] = useState(true);
  const [messagesPerInstance, setMessagesPerInstance] = useState("10");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const { toast } = useToast();

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, tags")
      .order("created_at", { ascending: false });
    setContacts(data || []);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch)
  );

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const progress = 65;
  const sent = 650;
  const total = 1000;

  const handleStart = () => {
    if (selectedContacts.size === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos 1 contato na aba Contatos", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Erro", description: "Escreva a mensagem", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  const variables = ["{nome}", "{telefone}", "{empresa}", "{data}"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nova Campanha</h1>
        <p className="text-muted-foreground">Configure e dispare mensagens em massa</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Message Composer */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl p-5 lg:col-span-2"
        >
          <Tabs defaultValue="message" className="space-y-4">
            <TabsList className="bg-secondary">
              <TabsTrigger value="message" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageSquare className="mr-1.5 h-4 w-4" /> Mensagem
              </TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="mr-1.5 h-4 w-4" /> Contatos
                {selectedContacts.size > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 text-xs font-bold">
                    {selectedContacts.size}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings2 className="mr-1.5 h-4 w-4" /> Config
              </TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Clock className="mr-1.5 h-4 w-4" /> Agendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="space-y-4">
              <div>
                <Label className="text-foreground">Nome da Campanha</Label>
                <Input
                  placeholder="Ex: Promoção Janeiro"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Mensagem</Label>
                  <div className="flex gap-1">
                    {variables.map((v) => (
                      <button
                        key={v}
                        onClick={() => setMessage((prev) => prev + " " + v)}
                        className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  placeholder={"Olá {nome}! 👋\n\nTemos uma oferta especial para você..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 min-h-[180px] bg-secondary border-border text-foreground"
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Switch checked={useButtons} onCheckedChange={setUseButtons} />
                <Label className="text-foreground">Enviar com botão (requer API compatível)</Label>
              </div>

              {useButtons && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 rounded-lg border border-border p-4"
                >
                  <div>
                    <Label className="text-foreground">Texto do Botão</Label>
                    <Input
                      placeholder="Saiba Mais"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">URL do Botão</Label>
                    <Input
                      placeholder="https://seusite.com.br"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      className="bg-secondary border-border text-foreground"
                    />
                  </div>
                </motion.div>
              )}
            </TabsContent>

            {/* CONTACTS TAB */}
            <TabsContent value="contacts" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedContacts.size} de {contacts.length} selecionados
                </p>
                <Button variant="outline" size="sm" className="border-border text-foreground" onClick={toggleAll}>
                  {selectedContacts.size === filteredContacts.length && filteredContacts.length > 0 ? (
                    <><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Desmarcar todos</>
                  ) : (
                    <><Square className="mr-1.5 h-3.5 w-3.5" /> Selecionar todos</>
                  )}
                </Button>
              </div>

              <Input
                placeholder="Buscar contato..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />

              <div className="max-h-[350px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <Users className="mb-2 h-6 w-6" />
                    <p className="text-sm">Nenhum contato. Importe na aba Contatos do menu.</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-secondary/40 transition-colors"
                    >
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => toggleContact(contact.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-5">
              <div>
                <Label className="text-foreground">Instância WhatsApp</Label>
                <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todas (rotacionar)</SelectItem>
                    <SelectItem value="1">WhatsApp Principal</SelectItem>
                    <SelectItem value="2">WhatsApp Vendas</SelectItem>
                    <SelectItem value="3">WhatsApp Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Switch checked={rotateInstances} onCheckedChange={setRotateInstances} />
                <div>
                  <Label className="text-foreground">Rotacionar entre instâncias</Label>
                  <p className="text-xs text-muted-foreground">
                    Alterna automaticamente entre os WhatsApps conectados
                  </p>
                </div>
              </div>

              {rotateInstances && (
                <div>
                  <Label className="text-foreground">Mensagens por instância antes de alternar</Label>
                  <Input
                    type="number"
                    min="1"
                    value={messagesPerInstance}
                    onChange={(e) => setMessagesPerInstance(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Intervalo entre mensagens</Label>
                  <span className="text-sm font-semibold text-primary">{interval[0]}s</span>
                </div>
                <Slider
                  value={interval}
                  onValueChange={setInterval}
                  max={120}
                  min={5}
                  step={1}
                  className="mt-2"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>5s</span>
                  <span>120s</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 text-info" />
                <p className="text-sm text-muted-foreground">
                  Agende o disparo para uma data e hora específica. A campanha será iniciada automaticamente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Data</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground">Hora</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Right: Controls & Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Status */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="mb-3 font-semibold text-foreground">Status do Disparo</h3>
            {isRunning ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold text-primary">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full gradient-green rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-secondary p-2">
                    <p className="text-lg font-bold text-primary">{sent}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <p className="text-lg font-bold text-foreground">{total - sent}</p>
                    <p className="text-xs text-muted-foreground">Restantes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isPaused ? "bg-warning" : "bg-primary animate-pulse-green"}`} />
                  <span className="text-xs text-muted-foreground">
                    {isPaused ? "Pausado" : "Enviando..."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Zap className="mb-2 h-8 w-8" />
                <p className="text-sm">Campanha não iniciada</p>
                {selectedContacts.size > 0 && (
                  <p className="mt-1 text-xs text-primary font-medium">
                    {selectedContacts.size} contatos selecionados
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="glass-card space-y-2 rounded-xl p-5">
            <h3 className="mb-3 font-semibold text-foreground">Ações</h3>
            {!isRunning ? (
              <Button
                onClick={handleStart}
                className="w-full gradient-green text-primary-foreground font-semibold"
              >
                <Send className="mr-2 h-4 w-4" /> Iniciar Disparo
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePause}
                  variant="outline"
                  className="w-full border-border text-foreground"
                >
                  {isPaused ? (
                    <><Play className="mr-2 h-4 w-4" /> Retomar</>
                  ) : (
                    <><Pause className="mr-2 h-4 w-4" /> Pausar</>
                  )}
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                >
                  Parar Campanha
                </Button>
              </>
            )}
          </div>

          {/* Preview */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="mb-3 font-semibold text-foreground">Pré-visualização</h3>
            <div className="rounded-lg bg-[hsl(142_30%_15%)] p-4">
              <div className="rounded-lg rounded-tl-none bg-[hsl(142_40%_20%)] p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {message || "Sua mensagem aparecerá aqui..."}
                </p>
                {useButtons && buttonText && (
                  <div className="mt-2 rounded border border-primary/30 bg-primary/10 px-3 py-1.5 text-center text-xs font-medium text-primary">
                    {buttonText}
                  </div>
                )}
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">12:00 ✓✓</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Campaigns;
