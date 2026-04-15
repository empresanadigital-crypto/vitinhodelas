import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Pause,
  Play,
  MessageSquare,
  Settings2,
  Zap,
  Users,
  CheckSquare,
  Square,
  StopCircle,
  RefreshCw,
  Shield,
  Info,
  History,
  Trash2,
  Plus,
  ImageIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[] | null;
}

interface Instance {
  id: string;
  name: string;
  instance_id: string | null;
  provider: string;
  status: string;
}

const Campaigns = () => {
  const [campaignName, setCampaignName] = useState("");
  const [messages, setMessages] = useState<string[]>([""]);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [previewVariation, setPreviewVariation] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState("all");
  const [rotateInstances, setRotateInstances] = useState(true);
  const [messagesPerInstance, setMessagesPerInstance] = useState("10");

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");

  // Instances
  const [instances, setInstances] = useState<Instance[]>([]);

  // Campaign tracking
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  const [campaignStatus, setCampaignStatus] = useState<string>("idle");
  const [pastCampaigns, setPastCampaigns] = useState<any[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, tags")
      .order("created_at", { ascending: false });
    setContacts(data || []);
  }, []);

  const fetchInstances = useCallback(async () => {
    const { data } = await supabase
      .from("instances")
      .select("id, name, instance_id, provider, status")
      .eq("status", "connected")
      .order("created_at", { ascending: false });
    setInstances(data || []);
  }, []);

  const fetchPastCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, status, total_contacts, sent_count, failed_count, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setPastCampaigns(data || []);
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchInstances();
    fetchPastCampaigns();
  }, [fetchContacts, fetchInstances, fetchPastCampaigns]);

  // Poll campaign progress when running
  useEffect(() => {
    if (!activeCampaignId || !isRunning) return;

    const pollInterval = window.setInterval(async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("sent_count, failed_count, total_contacts, status")
        .eq("id", activeCampaignId)
        .single();

      if (data) {
        setSentCount(data.sent_count);
        setFailedCount(data.failed_count);
        setTotalToSend(data.total_contacts);
        setCampaignStatus(data.status);

        if (data.status === "completed" || data.status === "stopped" || data.status === "cancelled") {
          setIsRunning(false);
          setIsPaused(false);
          fetchPastCampaigns();
          const titleMap: Record<string, string> = {
            completed: "Campanha concluída!",
            stopped: "Campanha parada",
            cancelled: "Campanha cancelada",
          };
          toast({
            title: titleMap[data.status] || "Campanha finalizada",
            description: `${data.sent_count} enviadas, ${data.failed_count} falhas de ${data.total_contacts} contatos.`,
          });
        } else if (data.status === "paused") {
          setIsPaused(true);
        } else if (data.status === "sending") {
          setIsPaused(false);
        }
      }
    }, 3000);

    return () => window.clearInterval(pollInterval);
  }, [activeCampaignId, isRunning, toast, fetchPastCampaigns]);

  // Get unique tags
  const allTags = Array.from(
    new Set(contacts.flatMap((c) => c.tags || []))
  ).sort();

  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch);
    const matchTag = filterTag === "all" || (c.tags || []).includes(filterTag);
    return matchSearch && matchTag;
  });

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedContacts.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  // Helper to call worker-proxy
  const invokeWorker = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("worker-proxy", {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  // ─── START via worker-proxy ─────────────────────────
  const handleStart = async () => {
    if (selectedContacts.size === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos 1 contato na aba Contatos", variant: "destructive" });
      return;
    }
    if (!messages.some(m => m.trim())) {
      toast({ title: "Erro", description: "Escreva pelo menos uma mensagem", variant: "destructive" });
      return;
    }
    if (instances.length === 0) {
      toast({ title: "Erro", description: "Nenhuma instância conectada disponível.", variant: "destructive" });
      return;
    }

    const contactIds = Array.from(selectedContacts);
    const selectedTags = filterTag !== "all" ? [filterTag] : undefined;

    // Upload image if present
    let uploadedImageUrl: string | null = null;
    if (imageFile) {
      const filePath = `${user!.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage.from('campaign-images').upload(filePath, imageFile);
      if (uploadError) {
        toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from('campaign-images').getPublicUrl(filePath);
      uploadedImageUrl = urlData.publicUrl;
    }

    // Save campaign to DB
    const { data: campaign, error: campaignError } = await supabase.from("campaigns").insert({
      user_id: user!.id,
      name: campaignName || "Campanha sem nome",
      message: messages.filter(m => m.trim()).join("|||"),
      total_contacts: contactIds.length,
      interval_seconds: 15,
      rotate_instances: selectedInstance === "all" ? rotateInstances : false,
      messages_per_instance: parseInt(messagesPerInstance) || 10,
      selected_instance_id: selectedInstance !== "all" ? selectedInstance : null,
      contact_ids: contactIds,
      status: "draft",
      image_url: uploadedImageUrl,
      started_at: null,
    } as any).select("id").single();

    if (campaignError || !campaign) {
      toast({ title: "Erro", description: campaignError?.message || "Falha ao criar campanha", variant: "destructive" });
      return;
    }

    const campaignId = campaign.id;
    setActiveCampaignId(campaignId);
    setSentCount(0);
    setFailedCount(0);
    setTotalToSend(contactIds.length);
    setDispatchLog([]);
    setCampaignStatus("draft");

    setIsRunning(true);
    setIsPaused(false);

    try {
      const result = await invokeWorker("start", {
        campaign_id: campaignId,
        contact_ids: contactIds,
        tags: selectedTags,
        selected_instance_id: selectedInstance !== "all" ? selectedInstance : undefined,
      });

      addLog(`🚀 Campanha iniciada no worker: ${result?.jobs_created || contactIds.length} jobs criados`);
      toast({ title: "Campanha iniciada!", description: "O worker está processando os envios em segundo plano." });
      if (result?.invalid_skipped > 0) {
        toast({ title: "Atenção", description: `${result.invalid_skipped} contatos com telefone inválido foram ignorados.`, variant: "destructive" });
      }
      fetchPastCampaigns();
    } catch (err: any) {
      addLog(`❌ Erro ao iniciar: ${err.message}`);
      toast({ title: "Erro ao iniciar", description: err.message, variant: "destructive" });
      setIsRunning(false);

      // Revert campaign status
      await supabase.from("campaigns").update({ status: "draft" }).eq("id", campaignId);
    }
  };

  const addLog = (msg: string) => {
    setDispatchLog((prev) => [...prev.slice(-50), msg]);
  };

  const handlePause = async () => {
    if (!activeCampaignId) return;
    try {
      if (isPaused) {
        await invokeWorker("resume", { campaign_id: activeCampaignId });
        addLog("▶️ Campanha retomada");
        setIsPaused(false);
      } else {
        await invokeWorker("pause", { campaign_id: activeCampaignId });
        addLog("⏸️ Campanha pausada");
        setIsPaused(true);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleStop = async () => {
    if (!activeCampaignId) return;
    try {
      await invokeWorker("stop", { campaign_id: activeCampaignId });
      addLog("⛔ Campanha parada");
      setIsRunning(false);
      setIsPaused(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleRefreshStatus = async () => {
    if (!activeCampaignId) return;
    try {
      const result = await invokeWorker("status", { campaign_id: activeCampaignId });
      addLog(`📊 Status: ${JSON.stringify(result)}`);
    } catch (err: any) {
      addLog(`❌ Erro ao consultar status: ${err.message}`);
    }
  };

  const progress = totalToSend > 0 ? Math.round(((sentCount + failedCount) / totalToSend) * 100) : 0;
  const variables = ["{nome}", "{telefone}"];

  return (
    <div className="p-6 md:p-7 space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', color: '#f2f2ff' }}>Nova Campanha</h1>
        <p style={{ fontSize: 12, color: 'rgba(242,242,255,0.28)' }}>Configure e dispare mensagens em massa</p>
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
              <TabsTrigger value="message" style={{ fontSize: 12, fontWeight: 500, color: 'rgba(242,242,255,0.4)' }} className="data-[state=active]:!bg-[rgba(59,130,246,0.08)] data-[state=active]:!text-[#f2f2ff] data-[state=active]:!font-semibold">
                <MessageSquare className="mr-1.5 h-4 w-4" /> Mensagem
              </TabsTrigger>
              <TabsTrigger value="contacts" style={{ fontSize: 12, fontWeight: 500, color: 'rgba(242,242,255,0.4)' }} className="data-[state=active]:!bg-[rgba(59,130,246,0.08)] data-[state=active]:!text-[#f2f2ff] data-[state=active]:!font-semibold">
                <Users className="mr-1.5 h-4 w-4" /> Contatos
                {selectedContacts.size > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 text-xs font-bold">
                    {selectedContacts.size}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" style={{ fontSize: 12, fontWeight: 500, color: 'rgba(242,242,255,0.4)' }} className="data-[state=active]:!bg-[rgba(59,130,246,0.08)] data-[state=active]:!text-[#f2f2ff] data-[state=active]:!font-semibold">
                <Settings2 className="mr-1.5 h-4 w-4" /> Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="space-y-4">
              {/* Image upload */}
              <div>
                <Label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242,242,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Imagem (opcional)</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {imagePreview ? (
                  <div className="flex items-center gap-3 mt-1 rounded-lg border border-border bg-secondary/30 p-3">
                    <img src={imagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium truncate">{imageFile?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{imageFile ? (imageFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                    </div>
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 border-border text-muted-foreground hover:text-foreground"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="mr-1.5 h-4 w-4" /> Anexar Imagem
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground mt-1 ml-0.5">Quando há imagem, o texto da mensagem vira o caption.</p>
              </div>

              <div>
                <Label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242,242,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Nome da Campanha</Label>
                <Input
                  placeholder="Ex: Promoção Janeiro"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242,242,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Mensagens</Label>
                  <div className="flex gap-1">
                     {variables.map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          setMessages((prev) => {
                            const updated = [...prev];
                            updated[activeMessageIndex] = (updated[activeMessageIndex] || "") + " " + v;
                            return updated;
                          });
                        }}
                        className="rounded bg-primary/10 px-2 py-0.5 text-primary transition-colors hover:bg-primary/20"
                        style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em' }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 mt-1">
                  {messages.map((msg, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <Label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(242,242,255,0.3)' }}>Mensagem {index + 1}</Label>
                        {messages.length > 1 && (
                          <button
                            onClick={() => {
                              setMessages((prev) => prev.filter((_, i) => i !== index));
                              setActiveMessageIndex((prev) => Math.min(prev, messages.length - 2));
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <Textarea
                        placeholder={"Olá {nome}! 👋\n\nTemos uma oferta especial para você..."}
                        value={msg}
                        onChange={(e) => {
                          setMessages((prev) => {
                            const updated = [...prev];
                            updated[index] = e.target.value;
                            return updated;
                          });
                        }}
                        onFocus={() => setActiveMessageIndex(index)}
                        className="min-h-[140px] bg-secondary border-border text-foreground"
                      />
                    </div>
                  ))}
                </div>
                {messages.length < 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setMessages((prev) => [...prev, ""])}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar variação
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5 ml-0.5">
                  O sistema escolhe uma mensagem aleatória para cada contato, reduzindo risco de ban.
                </p>
                <div className="flex items-start gap-2 mt-2 px-1">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Dica anti-ban: use <code className="rounded bg-secondary px-1 py-0.5 text-[10px] font-mono text-primary">{"{opção1|opção2|opção3}"}</code> para variar a mensagem automaticamente. Ex: <code className="rounded bg-secondary px-1 py-0.5 text-[10px] font-mono text-primary">{"{Olá|Oi|E aí}"}</code> → cada contato recebe uma versão diferente.
                  </p>
                </div>
              </div>

            </TabsContent>

            {/* CONTACTS TAB */}
            <TabsContent value="contacts" className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {selectedContacts.size} de {contacts.length} selecionados
                </p>
                <div className="flex gap-2">
                  {allTags.length > 0 && (
                    <Select value={filterTag} onValueChange={setFilterTag}>
                      <SelectTrigger className="w-[160px] bg-secondary border-border text-foreground text-xs h-8">
                        <SelectValue placeholder="Filtrar por tag" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">Todas as tags</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="outline" size="sm" className="border-border text-foreground h-8" onClick={toggleAll}>
                    {selectedContacts.size === filteredContacts.length && filteredContacts.length > 0 ? (
                      <><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Desmarcar</>
                    ) : (
                      <><Square className="mr-1.5 h-3.5 w-3.5" /> Selecionar todos</>
                    )}
                  </Button>
                </div>
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
                      <div className="flex gap-1">
                        {(contact.tags || []).map((tag) => (
                          <span key={tag} className="rounded-[10px]" style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.12)' }}>{tag}</span>
                        ))}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-5">
              <div>
                <Label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242,242,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Instância WhatsApp</Label>
                <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todas conectadas (rotacionar)</SelectItem>
                    {instances.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name} ({inst.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {instances.length === 0 && (
                  <p className="mt-1 text-xs text-destructive">Nenhuma instância conectada. Conecte uma na aba Instâncias.</p>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Switch checked={rotateInstances} onCheckedChange={setRotateInstances} />
                <div>
                  <Label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242,242,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Rotacionar entre instâncias</Label>
                  <p className="text-xs text-muted-foreground">Alterna entre WhatsApps conectados</p>
                </div>
              </div>

              {rotateInstances && (
                <div>
                  <Label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242,242,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Mensagens por instância antes de alternar</Label>
                  <Input type="number" min="1" value={messagesPerInstance} onChange={(e) => setMessagesPerInstance(e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
                <Shield className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O intervalo entre mensagens é controlado automaticamente pelo sistema anti-ban no servidor. Delay aleatório de 12-45s + pausas automáticas a cada 25 mensagens.
                </p>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Status do Disparo</h3>
              {isRunning && (
                <Button variant="ghost" size="sm" onClick={handleRefreshStatus} className="h-7 w-7 p-0">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {isRunning ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span style={{
                    fontSize: 22, fontWeight: 900,
                    background: 'linear-gradient(160deg, #ffffff 20%, rgba(200,210,255,0.5) 60%, rgba(242,242,255,0.15))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full gradient-blue rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary p-2">
                    <p style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(160deg, #ffffff 20%, rgba(200,210,255,0.5) 60%, rgba(242,242,255,0.15))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}>{sentCount}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(242,242,255,0.2)' }}>Enviadas</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <p style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(160deg, #ffffff 20%, rgba(200,210,255,0.5) 60%, rgba(242,242,255,0.15))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}>{failedCount}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(242,242,255,0.2)' }}>Falhas</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <p style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(160deg, #ffffff 20%, rgba(200,210,255,0.5) 60%, rgba(242,242,255,0.15))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}>{totalToSend - sentCount - failedCount}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(242,242,255,0.2)' }}>Restantes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isPaused ? "bg-yellow-500" : "bg-primary animate-pulse"}`} />
                  <span className="text-xs text-muted-foreground">
                    {isPaused ? "Pausado" : "Worker processando..."}
                  </span>
                </div>
              </div>
            ) : totalToSend > 0 ? (
              <div className="space-y-2 text-center py-4">
                <p className="text-sm font-medium text-foreground">Campanha finalizada</p>
                <p className="text-xs text-muted-foreground">
                  ✅ {sentCount} enviadas · ❌ {failedCount} falhas
                </p>
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
                className="w-full gradient-blue text-primary-foreground"
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em' }}
                disabled={selectedContacts.size === 0 || !messages.some(m => m.trim())}
              >
                <Send className="mr-2 h-4 w-4" /> Iniciar Disparo ({selectedContacts.size} contatos)
              </Button>
            ) : (
              <>
                <Button onClick={handlePause} variant="outline" className="w-full border-border text-foreground">
                  {isPaused ? (
                    <><Play className="mr-2 h-4 w-4" /> Retomar</>
                  ) : (
                    <><Pause className="mr-2 h-4 w-4" /> Pausar</>
                  )}
                </Button>
                <Button onClick={handleStop} variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                  <StopCircle className="mr-2 h-4 w-4" /> Parar Campanha
                </Button>
              </>
            )}
          </div>

          {/* Log */}
          {dispatchLog.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="mb-3 font-semibold text-foreground">Log</h3>
              <div className="max-h-[200px] overflow-y-auto space-y-1 text-xs font-mono">
                {dispatchLog.map((log, i) => (
                  <p key={i} className="text-muted-foreground">{log}</p>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="mb-3 font-semibold text-foreground">Pré-visualização</h3>
            {messages.filter(m => m.trim()).length > 1 && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {messages.map((m, i) => m.trim() ? (
                  <button
                    key={i}
                    onClick={() => setPreviewVariation(i)}
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      previewVariation === i
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Variação {i + 1}
                  </button>
                ) : null)}
              </div>
            )}
            <div className="rounded-lg bg-[hsl(142_30%_15%)] p-4">
              <div className="rounded-lg rounded-tl-none bg-[hsl(142_40%_20%)] p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {(() => {
                    const currentMsg = messages[previewVariation] || messages.find(m => m.trim()) || "";
                    return currentMsg.trim()
                      ? currentMsg.split(/(\{[^}]*\|[^}]*\})/).map((part, i) => {
                          const spinMatch = part.match(/^\{([^}]*\|[^}]*)\}$/);
                          if (spinMatch) {
                            const firstOption = spinMatch[1].split("|")[0];
                            return <span key={i} className="rounded bg-primary/10 px-1">{firstOption}</span>;
                          }
                          return <span key={i}>{part}</span>;
                        })
                      : "Sua mensagem aparecerá aqui...";
                  })()}
                </p>
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">12:00 ✓✓</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Histórico de Campanhas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-5"
      >
        <h3 className="flex items-center gap-2 mb-4 font-semibold text-foreground">
          <History className="h-4 w-4" /> Histórico de Campanhas
        </h3>
        {pastCampaigns.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <History className="mb-2 h-6 w-6" />
            <p className="text-sm">Nenhuma campanha ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ fontSize: 11 }}>Nome</TableHead>
                  <TableHead style={{ fontSize: 11 }}>Status</TableHead>
                  <TableHead style={{ fontSize: 11 }}>Enviadas</TableHead>
                  <TableHead style={{ fontSize: 11 }}>Falhas</TableHead>
                  <TableHead style={{ fontSize: 11 }}>Data</TableHead>
                  <TableHead style={{ fontSize: 11 }}>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastCampaigns.map((c) => {
                  const statusConfig: Record<string, { color: string; label: string }> = {
                    sending: { color: "bg-blue-500 animate-pulse", label: "Enviando" },
                    completed: { color: "bg-green-500", label: "Concluída" },
                    paused: { color: "bg-yellow-500", label: "Pausada" },
                    cancelled: { color: "bg-red-500", label: "Cancelada" },
                    failed: { color: "bg-red-500", label: "Falhou" },
                    stopped: { color: "bg-red-500", label: "Parada" },
                    draft: { color: "bg-gray-500", label: "Rascunho" },
                    scheduled: { color: "bg-purple-500", label: "Agendada" },
                  };
                  const st = statusConfig[c.status] || { color: "bg-gray-400", label: c.status };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`inline-block h-2 w-2 rounded-full ${st.color}`} />
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{c.sent_count}/{c.total_contacts}</TableCell>
                      <TableCell className="text-xs font-mono">{c.failed_count}</TableCell>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        {c.status === "paused" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={async () => {
                              try {
                                await invokeWorker("resume", { campaign_id: c.id });
                                toast({ title: "Campanha retomada" });
                                fetchPastCampaigns();
                              } catch (err: any) {
                                toast({ title: "Erro", description: err.message, variant: "destructive" });
                              }
                            }}
                          >
                            <Play className="h-3.5 w-3.5 text-green-400" />
                          </Button>
                        )}
                        {c.status === "sending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={async () => {
                              try {
                                await invokeWorker("pause", { campaign_id: c.id });
                                toast({ title: "Campanha pausada" });
                                fetchPastCampaigns();
                              } catch (err: any) {
                                toast({ title: "Erro", description: err.message, variant: "destructive" });
                              }
                            }}
                          >
                            <Pause className="h-3.5 w-3.5 text-yellow-400" />
                          </Button>
                        )}
                        {["completed", "cancelled", "failed", "stopped", "draft"].includes(c.status) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta campanha? Os registros de envio também serão removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    try {
                                      await supabase.from("campaign_jobs").delete().eq("campaign_id", c.id);
                                      await supabase.from("campaign_logs").delete().eq("campaign_id", c.id);
                                      await supabase.from("campaigns").delete().eq("id", c.id);
                                      fetchPastCampaigns();
                                      toast({ title: "Campanha excluída" });
                                    } catch (err: any) {
                                      toast({ title: "Erro", description: err.message, variant: "destructive" });
                                    }
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Campaigns;
