import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Pause, Play, MessageSquare, Zap, Users, Square, RefreshCw,
  Plus, ImageIcon, X, ArrowLeft, ArrowRight, Check, Search, Trash2, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  // Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [campaignName, setCampaignName] = useState("");
  const [messages, setMessages] = useState<string[]>([""]);
  const [previewVariation, setPreviewVariation] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");

  // Step 3 — Configs
  const [selectedInstance, setSelectedInstance] = useState("all");
  const [rotateInstances, setRotateInstances] = useState(true);
  const [messagesPerInstance, setMessagesPerInstance] = useState("10");
  const [intervalSeconds, setIntervalSeconds] = useState("15");

  // Instances
  const [instances, setInstances] = useState<Instance[]>([]);

  // Tracking
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  const [campaignStatus, setCampaignStatus] = useState<string>("idle");

  const { user } = useAuth();
  const { toast } = useToast();

  // ─── FETCH ────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, phone, tags")
      .order("created_at", { ascending: false });
    setContacts((data as Contact[]) || []);
  }, []);

  const fetchInstances = useCallback(async () => {
    const { data } = await supabase
      .from("instances")
      .select("id, name, instance_id, provider, status")
      .eq("status", "connected")
      .order("created_at", { ascending: false });
    setInstances((data as Instance[]) || []);
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchInstances();
  }, [fetchContacts, fetchInstances]);

  // Poll progresso
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
  }, [activeCampaignId, isRunning, toast]);

  // ─── DERIVADOS ────────────────────────────────────
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || []))).sort();

  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch);
    const matchTag = filterTag === "all" || (c.tags || []).includes(filterTag);
    return matchSearch && matchTag;
  });

  const validMessages = messages.filter((m) => m.trim());
  const progress = totalToSend > 0 ? Math.round(((sentCount + failedCount) / totalToSend) * 100) : 0;

  // ─── HANDLERS ─────────────────────────────────────
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!ALLOWED_MIME.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Aceitamos apenas JPG, PNG e WEBP.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Imagem muito grande", description: "Tamanho máximo 5 MB. Comprima e tente novamente.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const invokeWorker = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("worker-proxy", {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  const addLog = (msg: string) => setDispatchLog((prev) => [...prev.slice(-50), msg]);

  const handleStart = async () => {
    if (selectedContacts.size === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos 1 contato.", variant: "destructive" });
      return;
    }
    if (!messages.some((m) => m.trim())) {
      toast({ title: "Erro", description: "Escreva pelo menos uma mensagem.", variant: "destructive" });
      return;
    }
    if (instances.length === 0) {
      toast({ title: "Erro", description: "Nenhuma instância conectada disponível.", variant: "destructive" });
      return;
    }

    const contactIds = Array.from(selectedContacts);
    const selectedTags = filterTag !== "all" ? [filterTag] : undefined;

    let uploadedImageUrl: string | null = null;
    if (imageFile) {
      const filePath = `${user!.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage.from("campaign-images").upload(filePath, imageFile);
      if (uploadError) {
        toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("campaign-images").getPublicUrl(filePath);
      uploadedImageUrl = urlData.publicUrl;
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        user_id: user!.id,
        name: campaignName || "Campanha sem nome",
        message: messages.filter((m) => m.trim()).join("|||"),
        total_contacts: contactIds.length,
        interval_seconds: parseInt(intervalSeconds) || 15,
        rotate_instances: selectedInstance === "all" ? rotateInstances : false,
        messages_per_instance: parseInt(messagesPerInstance) || 10,
        selected_instance_id: selectedInstance !== "all" ? selectedInstance : null,
        contact_ids: contactIds,
        status: "draft",
        image_url: uploadedImageUrl,
        started_at: null,
      } as any)
      .select("id")
      .single();

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

      addLog(`🚀 Campanha iniciada: ${result?.jobs_created || contactIds.length} jobs criados`);
      toast({ title: "Campanha iniciada!", description: "O worker está processando os envios." });
      if (result?.invalid_skipped > 0) {
        toast({ title: "Atenção", description: `${result.invalid_skipped} contatos com telefone inválido foram ignorados.`, variant: "destructive" });
      }
    } catch (err: any) {
      addLog(`❌ Erro ao iniciar: ${err.message}`);
      toast({ title: "Erro ao iniciar", description: err.message, variant: "destructive" });
      setIsRunning(false);
      await supabase.from("campaigns").update({ status: "draft" }).eq("id", campaignId);
    }
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

  // ─── RENDER ───────────────────────────────────────
  const canGoNextFromStep1 = messages.some((m) => m.trim());
  const canGoNextFromStep2 = selectedContacts.size > 0;

  return (
    <div className="px-9 pb-12 pt-7 max-w-[1440px]">
      {/* Topbar */}
      <div className="mb-6">
        <h1 className="text-[38px] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--text)]">Nova Campanha</h1>
        <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">Configure e dispare mensagens em 3 passos</p>
      </div>

      {/* Stepper */}
      <div className="mb-5 flex items-center gap-4 rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-6 py-4 shadow-[var(--shadow-sm)]">
        <StepperItem num={1} label="Mensagem" active={step === 1} done={step > 1} canClick={true} onClick={() => setStep(1)} />
        <span className={`h-[1.5px] w-6 ${step > 1 ? "bg-[var(--green-fn)]" : "bg-[var(--border-color)]"}`} />
        <StepperItem num={2} label="Contatos" active={step === 2} done={step > 2} canClick={canGoNextFromStep1} onClick={() => canGoNextFromStep1 && setStep(2)} />
        <span className={`h-[1.5px] w-6 ${step > 2 ? "bg-[var(--green-fn)]" : "bg-[var(--border-color)]"}`} />
        <StepperItem num={3} label="Revisar e Disparar" active={step === 3} done={false} canClick={canGoNextFromStep1 && canGoNextFromStep2} onClick={() => canGoNextFromStep1 && canGoNextFromStep2 && setStep(3)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* LEFT — Wizard */}
        <div>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
              <div className="border-b border-[var(--border-color)] px-6 py-5">
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text)]">Crie sua mensagem</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Escreva o texto. Adicione variações pra reduzir risco de ban — cada contato recebe uma versão diferente.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_280px]">
                <div>
                  {/* Nome da campanha */}
                  <div className="mb-5">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">Nome da campanha</label>
                    <input
                      type="text"
                      placeholder="Ex: Promoção dia das mães"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
                    />
                  </div>

                  {/* Variações */}
                  <div className="mb-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">Variações de mensagem</label>
                      <span className="text-[11px] text-[var(--text-muted)]">Clique numa pra ver no celular</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewVariation(idx)}
                          className={[
                            "rounded-xl border-[1.5px] p-3.5 transition-all",
                            previewVariation === idx
                              ? "border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
                              : "border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--border-strong)]",
                          ].join(" ")}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${previewVariation === idx ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                              Variação {idx + 1}
                            </span>
                            {messages.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessages((prev) => prev.filter((_, i) => i !== idx));
                                  setPreviewVariation((p) => Math.min(p, messages.length - 2));
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border-[1.5px] border-[var(--red)] bg-[var(--surface)] text-[var(--red)] transition-all hover:bg-[#FEE2E2]"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <textarea
                            value={msg}
                            onChange={(e) => {
                              const updated = [...messages];
                              updated[idx] = e.target.value;
                              setMessages(updated);
                            }}
                            onFocus={() => setPreviewVariation(idx)}
                            placeholder={"Olá {nome}! 👋\n\nTemos uma oferta especial para você..."}
                            className="min-h-[100px] w-full resize-y rounded-md border-0 bg-transparent text-[13px] leading-[1.5] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                          />
                        </div>
                      ))}
                      {messages.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setMessages((prev) => [...prev, ""])}
                          className="rounded-xl border-[1.5px] border-dashed border-[var(--border-strong)] bg-transparent p-3.5 text-center text-[13px] font-semibold text-[var(--text-muted)] transition-all hover:bg-[var(--pastel-gray)] hover:text-[var(--text)]"
                        >
                          <Plus className="mr-1.5 inline h-3.5 w-3.5 -translate-y-0.5" />
                          Adicionar variação
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["{nome}", "{telefone}"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const updated = [...messages];
                            updated[previewVariation] = (updated[previewVariation] || "") + " " + v;
                            setMessages(updated);
                          }}
                          className="rounded-md border border-[var(--border-strong)] bg-[var(--pastel-blue)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--blue)] transition-all hover:bg-[var(--blue)] hover:text-white"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      O sistema escolhe uma mensagem aleatória para cada contato, reduzindo risco de ban.
                    </p>
                  </div>

                  {/* Imagem */}
                  <div className="mb-2">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">Imagem (opcional)</label>
                      <span className="text-[11px] text-[var(--text-muted)]">JPG, PNG ou WEBP até 5 MB</span>
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-h-[140px] rounded-xl border-[1.5px] border-[var(--border-strong)] shadow-[var(--shadow-sm)]" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            if (imageInputRef.current) imageInputRef.current.value = "";
                          }}
                          className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--red)] text-white shadow-[1.5px_1.5px_0_var(--border-strong)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full rounded-xl border-[1.5px] border-dashed border-[var(--border-strong)] bg-[var(--pastel-gray)] p-5 text-center transition-all hover:bg-[var(--pastel-blue)]"
                      >
                        <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)]">
                          <ImageIcon className="h-4 w-4 text-[var(--text)]" />
                        </div>
                        <div className="text-[14px] font-bold text-[var(--text)]">Clique para anexar uma imagem</div>
                        <div className="mt-1 text-[11px] text-[var(--text-muted)]">Será enviada como mídia junto da mensagem</div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone preview */}
                <div>
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">Preview no celular</div>
                  <div className="mx-auto w-[240px] rounded-[24px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)]">
                    <div className="min-h-[360px] rounded-[16px] bg-[#DDD3C4] p-2.5">
                      {validMessages.length === 0 ? (
                        <div className="rounded-lg bg-[#DCF8C6] p-2.5 text-[12px] leading-[1.4] text-[#666] italic">
                          Sua mensagem aparecerá aqui...
                        </div>
                      ) : (
                        <div className="rounded-tl-none rounded-lg bg-[#DCF8C6] p-2.5 text-[12px] leading-[1.4] text-[#111] shadow-sm">
                          {imagePreview && <img src={imagePreview} alt="" className="mb-1.5 aspect-[4/3] w-full rounded object-cover" />}
                          <div className="whitespace-pre-wrap">
                            {(messages[previewVariation] || messages.find((m) => m.trim()) || "").replace(/\{nome\}/gi, "Maria")}
                          </div>
                          <span className="mt-1 block text-right text-[9px] text-[#667]">12:00 ✓✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {validMessages.length > 1 && (
                    <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
                      Variação <strong className="text-[var(--text)]">{previewVariation + 1}</strong> de {validMessages.length}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between border-t border-[var(--border-color)] bg-[var(--pastel-gray)] px-6 py-3.5">
                <span />
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canGoNextFromStep1}
                  className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]"
                >
                  Próximo: Contatos
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
              <div className="border-b border-[var(--border-color)] px-6 py-5">
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text)]">Selecione os contatos</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Escolha quais contatos vão receber. Use a busca ou filtre por tag.</p>
              </div>

              <div className="p-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="relative max-w-[320px] flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="search"
                      placeholder="Buscar por nome ou telefone..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-10 pr-3.5 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
                    />
                  </div>
                  {allTags.length > 0 && (
                    <select
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      className="rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none"
                    >
                      <option value="all">Todas as tags</option>
                      {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[12px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)]"
                  >
                    {selectedContacts.size === filteredContacts.length && filteredContacts.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                  <div className="ml-auto text-[13px] text-[var(--text-muted)]">
                    <strong className="text-[var(--text)]">{selectedContacts.size}</strong> de {contacts.length}
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto rounded-xl border-[1.5px] border-[var(--border-strong)]">
                  {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-[var(--text-muted)]">
                      <Users className="mb-2 h-7 w-7" />
                      <p className="text-[14px]">Nenhum contato. Importe na aba Contatos.</p>
                    </div>
                  ) : (
                    filteredContacts.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-[var(--border-color)] px-4 py-2.5 last:border-b-0 hover:bg-[var(--pastel-gray)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(c.id)}
                          onChange={() => toggleContact(c.id)}
                          className="h-4 w-4 cursor-pointer accent-[var(--green)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold text-[var(--text)]">{c.name}</div>
                          <div className="truncate font-mono text-[11px] text-[var(--text-muted)]">{c.phone}</div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(c.tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-[var(--text)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-between border-t border-[var(--border-color)] bg-[var(--pastel-gray)] px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--surface)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[1.5px_1.5px_0_var(--border-strong)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canGoNextFromStep2}
                  className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]"
                >
                  Próximo: Revisar
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
              <div className="border-b border-[var(--border-color)] px-6 py-5">
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text)]">Revisar e disparar</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Confira tudo antes de iniciar o envio. Você pode pausar ou parar a qualquer momento.</p>
              </div>

              <div className="p-6">
                <div className="mb-5 grid grid-cols-2 gap-3.5">
                  <ReviewCard label="Total de contatos" value={selectedContacts.size.toString()} big />
                  <ReviewCard label="Variações" value={validMessages.length.toString()} big />
                  <ReviewCard label="Imagem" value={imageFile ? "Sim" : "Não"} />
                  <ReviewCard label="Tag filtrada" value={filterTag === "all" ? "Todas" : filterTag} />
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">Configurações de envio</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={selectedInstance}
                      onChange={(e) => setSelectedInstance(e.target.value)}
                      className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
                    >
                      <option value="all">Todas conectadas (rotacionar)</option>
                      {instances.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={intervalSeconds}
                      onChange={(e) => setIntervalSeconds(e.target.value)}
                      placeholder="Intervalo em segundos"
                      className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    Intervalo entre mensagens. Recomendado: 15-30s para chips novos, 10-15s para chips antigos.
                  </p>
                </div>

                {selectedInstance === "all" && (
                  <div className="mb-5">
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">
                      <input
                        type="checkbox"
                        checked={rotateInstances}
                        onChange={(e) => setRotateInstances(e.target.checked)}
                        className="h-4 w-4 accent-[var(--green)]"
                      />
                      Rotacionar entre instâncias
                    </label>
                    {rotateInstances && (
                      <input
                        type="number"
                        min="1"
                        value={messagesPerInstance}
                        onChange={(e) => setMessagesPerInstance(e.target.value)}
                        placeholder="Mensagens por chip antes de alternar"
                        className="mt-2 w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
                      />
                    )}
                  </div>
                )}

                {instances.length === 0 && (
                  <div className="mb-5 flex items-center gap-3 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-yellow)] p-4 shadow-[var(--shadow-sm)]">
                    <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)]">
                      <Info className="h-4 w-4 text-[var(--amber)]" />
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-[#1D1D1B]">Nenhuma instância conectada</div>
                      <div className="text-[12px] text-[#1D1D1B] opacity-70">Conecte uma instância em /instancias antes de disparar.</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-[var(--border-color)] bg-[var(--pastel-gray)] px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[1.5px_1.5px_0_var(--border-strong)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isRunning || instances.length === 0}
                  className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-6 py-3 text-[15px] font-bold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]"
                >
                  <Zap className="h-4 w-4" />
                  Iniciar Disparo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Status sticky */}
        <div className="lg:sticky lg:top-7 lg:self-start">
          <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--border-color)] px-5 py-4">
              <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-green)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--green-dark)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-fn)] animate-pulse" />
                {isRunning ? (isPaused ? "PAUSADO" : "AO VIVO") : "AGUARDANDO"}
              </span>
              <h3 className="text-[14px] font-bold text-[var(--text)]">Status do disparo</h3>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{campaignName || "Sem nome"}</p>
            </div>

            <div className="px-5 py-4">
              <div className="text-[36px] font-bold leading-none tracking-[-0.03em] text-[var(--text)]">
                {sentCount + failedCount}
                <span className="text-[18px] text-[var(--text-muted)]"> / {totalToSend || selectedContacts.size}</span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-muted)]">{progress}% concluído</div>

              <div className="my-3.5 h-2 w-full overflow-hidden rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)]">
                <span className="block h-full rounded-full bg-[var(--green-fn)] transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--pastel-gray)] p-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Enviadas</div>
                  <div className="mt-0.5 text-[18px] font-bold text-[var(--green-dark)]">{sentCount}</div>
                </div>
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--pastel-gray)] p-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Falhas</div>
                  <div className="mt-0.5 text-[18px] font-bold text-[var(--red)]">{failedCount}</div>
                </div>
              </div>

              {isRunning && (
                <div className="mt-3.5 flex gap-2 border-t border-[var(--border-color)] pt-3.5">
                  <button
                    onClick={handlePause}
                    className="flex-1 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[11px] font-bold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)]"
                  >
                    {isPaused ? <><Play className="mr-1 inline h-3 w-3" />Retomar</> : <><Pause className="mr-1 inline h-3 w-3" />Pausar</>}
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex-1 rounded-[10px] border-[1.5px] border-[var(--red)] bg-[var(--surface)] px-3 py-2 text-[11px] font-bold text-[var(--red)] transition-all hover:bg-[#FEE2E2]"
                  >
                    <Square className="mr-1 inline h-3 w-3" />
                    Parar
                  </button>
                </div>
              )}
            </div>

            {dispatchLog.length > 0 && (
              <div className="border-t border-[var(--border-color)] px-5 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Log ao vivo</div>
                <div className="max-h-[160px] space-y-1 overflow-y-auto font-mono text-[10px] text-[var(--text-muted)]">
                  {dispatchLog.slice(-15).reverse().map((log, i) => (
                    <div key={i} className="border-b border-[var(--border-color)] py-1 last:border-b-0">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Stepper item ===== */
function StepperItem({
  num,
  label,
  active,
  done,
  canClick,
  onClick,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
  canClick: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canClick}
      className="flex flex-1 items-center gap-2.5 disabled:cursor-not-allowed"
    >
      <div
        className={[
          "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border-[1.5px] text-[14px] font-bold transition-all",
          done
            ? "border-[var(--green-fn)] bg-[var(--green-fn)] text-white"
            : active
              ? "border-[var(--border-strong)] bg-[var(--green)] text-[#1D1D1B] shadow-[1.5px_1.5px_0_var(--border-strong)]"
              : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)]",
        ].join(" ")}
      >
        {done ? <Check className="h-4 w-4" /> : num}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Passo {num}</span>
        <span className={`text-[14px] font-bold ${active || done ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>{label}</span>
      </div>
    </button>
  );
}

/* ===== Review card ===== */
function ReviewCard({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)] p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</div>
      <div className={`mt-1 font-bold text-[var(--text)] ${big ? "text-[28px] leading-none" : "text-[16px]"}`}>{value}</div>
    </div>
  );
}

export default Campaigns;
