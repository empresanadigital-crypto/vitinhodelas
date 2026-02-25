import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Save } from "lucide-react";

const SettingsPage = () => {
  const [apiProvider, setApiProvider] = useState("z-api");
  const [defaultInterval, setDefaultInterval] = useState("15");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Configurações gerais do disparador</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-2xl space-y-6 rounded-xl p-6"
      >
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">API WhatsApp</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Provedor Padrão</Label>
              <Select value={apiProvider} onValueChange={setApiProvider}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="z-api">Z-API</SelectItem>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                  <SelectItem value="codechat">CodeChat</SelectItem>
                  <SelectItem value="baileys">Baileys</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">URL Base da API</Label>
              <Input
                placeholder="https://api.z-api.io/instances/"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">Token / API Key</Label>
              <Input
                type="password"
                placeholder="Seu token de acesso"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Disparos</h2>
          <div>
            <Label className="text-foreground">Intervalo padrão entre mensagens (segundos)</Label>
            <Input
              type="number"
              min="5"
              value={defaultInterval}
              onChange={(e) => setDefaultInterval(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        <Button className="gradient-green text-primary-foreground font-semibold">
          <Save className="mr-2 h-4 w-4" /> Salvar Configurações
        </Button>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
