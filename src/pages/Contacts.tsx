import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Search, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
}

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [bulkText, setBulkText] = useState("");
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

  const importContacts = async () => {
    const lines = bulkText.trim().split("\n").filter(l => l.trim());
    const newContacts = lines
      .map((line) => {
        const parts = line.split(/[,;\t]/);
        if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
          const phone = parts[1].trim().replace(/\D/g, "");
          if (phone.length < 8) return null;
          return {
            user_id: user!.id,
            name: parts[0].trim(),
            phone,
            tags: ["Importado"],
          };
        }
        // Só número (sem nome)
        const phone = parts[0].trim().replace(/\D/g, "");
        if (phone.length < 8) return null;
        return {
          user_id: user!.id,
          name: phone,
          phone,
          tags: ["Importado"],
        };
      })
      .filter(Boolean) as any[];

    if (newContacts.length === 0) {
      toast({ title: "Erro", description: "Nenhum contato válido encontrado. Cole números com pelo menos 8 dígitos.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("contacts").insert(newContacts);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: `${newContacts.length} contatos importados!` });
      setBulkText("");
      setImportDialog(false);
      fetchContacts();
    }
  };

  const removeContact = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    fetchContacts();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground">{contacts.length} contatos na base</p>
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
            <div className="space-y-4 py-2">
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
              <Button onClick={importContacts} className="w-full gradient-green text-primary-foreground font-semibold">
                <Upload className="mr-2 h-4 w-4" /> Importar Contatos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou número..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border text-foreground pl-10" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden rounded-xl">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Nome</span><span>Número</span><span>Tags</span><span></span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((contact) => (
            <div key={contact.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-secondary/30">
              <span className="font-medium text-foreground">{contact.name}</span>
              <span className="font-mono text-sm text-muted-foreground">{contact.phone}</span>
              <div className="flex gap-1">
                {(contact.tags || []).map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{tag}</span>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeContact(contact.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="mb-2 h-8 w-8" /><p>Nenhum contato encontrado</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Contacts;
