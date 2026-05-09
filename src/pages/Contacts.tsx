import { useState, useEffect, useRef } from "react";
import { Upload, Search, Trash2, Pencil, FileSpreadsheet, FileText, Plus, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
      setContacts((data as Contact[]) || []);
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

  // Avatar color por iniciais
  const avatarColors = ["var(--green)", "var(--pastel-blue)", "var(--pastel-cream)", "var(--pastel-yellow)", "var(--pastel-green)"];
  const getAvatarColor = (name: string) => {
    const sum = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    return avatarColors[sum % avatarColors.length];
  };
  const getInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border-strong)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-9 pb-12 pt-7 max-w-[1440px]">
      {/* Topbar */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[38px] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--text)]">Contatos</h1>
          <p className="mt-1.5 text-[14px] text-[var(--text-muted)]">Gerencie sua base de contatos do WhatsApp</p>
        </div>
        <div className="flex gap-2.5">
          <Dialog open={importDialog} onOpenChange={setImportDialog}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[1.5px_1.5px_0_var(--border-strong)]">
                <Upload className="h-3.5 w-3.5" />
                Importar
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--surface)] border-[1.5px] border-[var(--border-strong)] max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-[var(--text)] text-[18px] font-bold">Importar Contatos</DialogTitle>
              </DialogHeader>
              <Tabs value={importTab} onValueChange={(v) => setImportTab(v)} className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-[var(--pastel-gray)] border-[1.5px] border-[var(--border-strong)] rounded-[10px] p-1">
                  <TabsTrigger value="text" className="flex items-center gap-1.5 data-[state=active]:bg-[var(--surface)] data-[state=active]:border-[1.5px] data-[state=active]:border-[var(--border-strong)] data-[state=active]:shadow-[1px_1px_0_var(--border-strong)] rounded-md text-[13px] font-semibold">
                    <FileText className="h-3.5 w-3.5" /> Colar texto
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-1.5 data-[state=active]:bg-[var(--surface)] data-[state=active]:border-[1.5px] data-[state=active]:border-[var(--border-strong)] data-[state=active]:shadow-[1px_1px_0_var(--border-strong)] rounded-md text-[13px] font-semibold">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Arquivo CSV/Excel
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-4 pt-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)] mb-2">Cole seus contatos (um por linha)</label>
                    <textarea
                      placeholder={"5511999991234\nMaria Silva, 5511999991234\n5521988885678"}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className="w-full min-h-[200px] rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] p-3 font-mono text-[13px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
                    />
                    <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                      Aceita só o número ou Nome, Número (um por linha). Sem nome, o número será usado como nome.
                    </p>
                  </div>
                  {bulkText.trim() && (
                    <p className="text-[13px] text-[var(--text-muted)]">
                      ✅ <strong className="text-[var(--text)]">{parseLines(bulkText).length}</strong> contatos válidos encontrados
                    </p>
                  )}
                  <button
                    onClick={() => importContacts("text")}
                    disabled={!bulkText.trim() || parseLines(bulkText).length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-5 py-3 text-[14px] font-bold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Contatos
                  </button>
                </TabsContent>
                <TabsContent value="file" className="space-y-4 pt-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)] mb-2">Selecione um arquivo CSV, TXT ou Excel</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-[10px] border-[1.5px] border-dashed border-[var(--border-strong)] bg-[var(--pastel-gray)] p-6 text-center transition-all hover:bg-[var(--pastel-blue)]"
                    >
                      <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
                      <p className="text-[14px] font-bold text-[var(--text)]">{fileName || "Clique pra escolher arquivo"}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">CSV, TXT, XLSX ou XLS</p>
                    </button>
                  </div>
                  {fileContacts.length > 0 && (
                    <p className="text-[13px] text-[var(--text-muted)]">
                      ✅ <strong className="text-[var(--text)]">{fileContacts.length}</strong> contatos válidos encontrados
                    </p>
                  )}
                  <button
                    onClick={() => importContacts("file")}
                    disabled={fileContacts.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-5 py-3 text-[14px] font-bold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Arquivo
                  </button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-[380px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-10 pr-3.5 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
          />
        </div>
        <div className="ml-auto text-[13px] text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">{filtered.length}</strong> contatos
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        {paginatedContacts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-[14px] text-[var(--text-muted)]">
              {search ? "Nenhum contato encontrado." : "Nenhum contato ainda."}
            </p>
            {!search && (
              <button
                onClick={() => setImportDialog(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-[#1D1D1B] shadow-[var(--shadow-sm)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[var(--shadow-md)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Importar primeiros contatos
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)]">
                <tr>
                  <th className="w-[60px] px-5 py-3"></th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Nome</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Telefone</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tags</th>
                  <th className="w-[120px] px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedContacts.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--pastel-gray)]">
                    <td className="px-5 py-3">
                      <div
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] text-[11px] font-bold text-[#1D1D1B]"
                        style={{ background: getAvatarColor(c.name) }}
                      >
                        {getInitials(c.name) || "?"}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-bold text-[var(--text)]">{c.name}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-[var(--text-muted)]">{c.phone}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map((tag) => (
                          <span key={tag} className="inline-flex items-center rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(c)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[var(--red)] bg-[var(--surface)] text-[var(--red)] transition-all hover:bg-[#FEE2E2]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-[13px] text-[var(--text-muted)]">
            Página <strong className="text-[var(--text)]">{currentPage}</strong> de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] transition-all hover:bg-[var(--pastel-gray)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[var(--surface)] border-[1.5px] border-[var(--border-strong)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--text)] text-[18px] font-bold">Editar Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)] mb-2">Nome</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-[14px] text-[var(--text)] outline-none transition-all focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)] mb-2">Tags (separadas por vírgula)</label>
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-[14px] text-[var(--text)] outline-none transition-all focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
              />
            </div>
            <button
              onClick={saveEdit}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-5 py-3 text-[14px] font-bold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)]"
            >
              Salvar Alterações
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[var(--surface)] border-[1.5px] border-[var(--border-strong)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text)]">Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-muted)]">
              Tem certeza que deseja excluir o contato <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[1.5px] border-[var(--border-strong)] rounded-[10px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeContact}
              className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90 rounded-[10px]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;
