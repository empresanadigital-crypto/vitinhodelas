import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Search, Trash2, Users, Loader2, Pencil, FileSpreadsheet, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
}

const PAGE_SIZE = 50;

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [importTab, setImportTab] = useState("text");
  const [fileContacts, setFileContacts] = useState<{ name: string; phone: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const [editDialog, setEditDialog] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, []);

  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedContacts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const parseLines = (text: string) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    return lines
      .map((line) => {
        const parts = line.split(/[,;\t]/);
        if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
          const phone = parts[1].trim().replace(/\D/g, "");
          if (phone.length < 8) return null;
          return { name: parts[0].trim(), phone };
        }
        const phone = parts[0].trim().replace(/\D/g, "");
        if (phone.length < 8) return null;
        return { name: phone, phone };
      })
      .filter(Boolean) as { name: string; phone: string }[];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const text = XLSX.utils.sheet_to_csv(ws);
        setFileContacts(parseLines(text));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setFileContacts(parseLines(text));
      };
      reader.readAsText(file);
    }
  };

  const importContacts = async (source: "text" | "file") => {
    const parsed = source === "text" ? parseLines(bulkText) : fileContacts;

    if (parsed.length === 0) {
      toast({ title: "Erro", description: "Nenhum contato válido encontrado.", variant: "destructive" });
      return;
    }

    const newContacts = parsed.map(c => ({
      user_id: user!.id,
      name: c.name,
      phone: c.phone,
      tags: ["Importado"],
    }));

    const { error } = await supabase.from("contacts").insert(newContacts);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: `${newContacts.length} contatos importados!` });
      setBulkText("");
      setFileContacts([]);
      setFileName("");
      setImportDialog(false);
      fetchContacts();
    }
  };

  const removeContact = async () => {
    if (!deleteTarget) return;
    await supabase.from("contacts").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    fetchContacts();
  };

  const openEdit = (contact: Contact) => {
    setEditContact(contact);
    setEditName(contact.name);
    setEditTags((contact.tags || []).join(", "));
    setEditDialog(true);
  };

  const saveEdit = async () => {
    if (!editContact) return;
    const tags = editTags.split(",").map(t => t.trim()).filter(Boolean);
    const { error } = await supabase
      .from("contacts")
      .update({ name: editName.trim(), tags })
      .eq("id", editContact.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contato atualizado!" });
      setEditDialog(false);
      setEditContact(null);
      fetchContacts();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 md:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-foreground" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Contatos</h1>
          <p className="text-xs text-muted-foreground">{contacts.length} contatos na base</p>
        </div>
        <Dialog open={importDialog} onOpenChange={setImportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-border text-foreground">
              <Upload className="mr-2 h-4 w-4" /> Importar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Importar Contatos</DialogTitle>
            </DialogHeader>
            <Tabs value={importTab} onValueChange={(v) => setImportTab(v)} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="text" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Colar texto
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Arquivo CSV/Excel
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="space-y-4 pt-2">
                <div>
                  <Label className="text-foreground">Cole seus contatos (um por linha)</Label>
                  <Textarea
                    placeholder={"5511999991234\nMaria Silva, 5511999991234\n5521988885678"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="mt-1 min-h-[200px] bg-secondary border-border text-foreground font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aceita só o número ou Nome, Número (um por linha). Sem nome, o número será usado como nome.
                  </p>
                </div>
                {bulkText.trim() && (
                  <p className="text-sm text-muted-foreground">
                    ✅ <strong className="text-foreground">{parseLines(bulkText).length}</strong> contatos válidos encontrados
                  </p>
                )}
                <Button
                  onClick={() => importContacts("text")}
                  className="w-full gradient-blue text-primary-foreground font-semibold"
                  disabled={!bulkText.trim() || parseLines(bulkText).length === 0}
                >
                  <Upload className="mr-2 h-4 w-4" /> Importar Contatos
                </Button>
              </TabsContent>
              <TabsContent value="file" className="space-y-4 pt-2">
                <div>
                  <Label className="text-foreground">Selecione um arquivo CSV, TXT ou Excel</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full mt-2 border-dashed border-2 border-border text-muted-foreground hover:text-foreground h-20"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="text-sm">{fileName || "Clique para selecionar arquivo"}</span>
                    </div>
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formatos aceitos: .csv, .txt, .xlsx — uma coluna com número ou duas colunas (nome, número)
                  </p>
                </div>
                {fileContacts.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    ✅ <strong className="text-foreground">{fileContacts.length}</strong> contatos encontrados no arquivo
                  </p>
                )}
                <Button
                  onClick={() => importContacts("file")}
                  className="w-full gradient-blue text-primary-foreground font-semibold"
                  disabled={fileContacts.length === 0}
                >
                  <Upload className="mr-2 h-4 w-4" /> Importar {fileContacts.length} Contatos
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou número..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border text-foreground pl-10" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden rounded-xl">
        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          <span>Nome</span><span>Número</span><span>Tags</span><span></span>
        </div>
        <div className="divide-y divide-border">
          {paginatedContacts.map((contact) => (
            <div key={contact.id} className="flex flex-col md:grid md:grid-cols-[1fr_1fr_auto_auto] md:items-center gap-2 md:gap-4 px-5 py-3 transition-colors hover:bg-[hsl(235,12%,11%)]">
              <span className="font-medium text-foreground">{contact.name}</span>
              <span className="font-mono text-sm text-muted-foreground">{contact.phone}</span>
              <div className="flex gap-1 flex-wrap">
                {(contact.tags || []).map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{tag}</span>
                ))}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(contact)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(contact)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="mb-3 h-10 w-10" />
              <p className="text-base font-medium mb-1">Nenhum contato encontrado</p>
              <p className="text-sm mb-4">{contacts.length === 0 ? "Importe seus contatos para começar" : "Tente outro termo de busca"}</p>
              {contacts.length === 0 && (
                <Button variant="outline" className="border-border text-foreground" onClick={() => setImportDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Importar contatos
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} · {filtered.length} contatos no total
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="border-border text-foreground">
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="border-border text-foreground">
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 bg-secondary border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground">Tags (separadas por vírgula)</Label>
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Ex: VIP, Cliente, Importado" className="mt-1 bg-secondary border-border text-foreground" />
            </div>
            <Button onClick={saveEdit} className="w-full gradient-blue text-primary-foreground font-semibold" disabled={!editName.trim()}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
