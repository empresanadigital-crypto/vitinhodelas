import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const tutorials = [
  {
    id: "connect",
    icon: "📱",
    title: "Conectar WhatsApp",
    description: "Como conectar seu chip via QR Code",
    steps: [
      "Vá em Instâncias no menu lateral",
      "Clique em Nova Instância",
      "Escolha Z-API (recomendado) ou Disparo Pro",
      "Para Z-API: cole o Instance ID e Token do painel z-api.io",
      "Clique em QR Code e escaneie pelo WhatsApp do celular",
      "Aguarde a confirmação de conexão",
    ],
  },
  {
    id: "import",
    icon: "👥",
    title: "Importar Contatos",
    description: "3 formas de adicionar seus contatos",
    steps: [
      "Vá em Contatos no menu lateral",
      "Clique em Importar Contatos",
      "Opção 1: Cole texto com nome e número (um por linha)",
      "Opção 2: Faça upload de arquivo CSV",
      "Opção 3: Faça upload de arquivo Excel (.xlsx)",
      "O sistema valida e remove duplicatas automaticamente",
    ],
  },
  {
    id: "campaign",
    icon: "🚀",
    title: "Criar Campanha",
    description: "Disparar mensagens em massa",
    steps: [
      "Vá em Campanhas no menu lateral",
      "Dê um nome para a campanha",
      "Escreva a mensagem (use {nome} e {telefone} para personalizar)",
      "Na aba Contatos, selecione quem vai receber",
      "Na aba Config, escolha a instância e o intervalo entre envios",
      "Clique em Iniciar Disparo",
      "Acompanhe o progresso em tempo real",
    ],
  },
  {
    id: "schedule",
    icon: "⏰",
    title: "Agendar Campanha",
    description: "Disparar no horário certo automaticamente",
    steps: [
      "Crie a campanha normalmente (mensagem + contatos)",
      "Vá na aba Agendar",
      "Escolha a data e hora do disparo",
      "Clique em Iniciar — a campanha ficará com status 'Agendada'",
      "No horário marcado, o sistema inicia automaticamente",
    ],
  },
  {
    id: "rotation",
    icon: "🔄",
    title: "Rotação de Chips",
    description: "Usar vários chips para proteção anti-ban",
    steps: [
      "Conecte 2 ou mais instâncias (chips)",
      "Ao criar campanha, selecione 'Todas conectadas (rotacionar)'",
      "Defina quantas mensagens por chip antes de alternar",
      "O sistema distribui os envios automaticamente",
      "Isso reduz drasticamente o risco de banimento",
    ],
  },
  {
    id: "reports",
    icon: "📊",
    title: "Relatórios",
    description: "Acompanhar resultados das campanhas",
    steps: [
      "Vá em Relatórios no menu lateral",
      "Veja o total de enviadas, falhas e taxa de sucesso",
      "Cada campanha mostra status detalhado",
      "Use os dados para otimizar suas próximas campanhas",
    ],
  },
];

const Training = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-0.05em",
          color: "#f2f2ff",
          marginBottom: 4,
        }}
      >
        Treinamentos
      </h1>
      <p style={{ fontSize: 13, color: "rgba(242,242,255,0.28)", marginBottom: 32 }}>
        Aprenda a usar cada recurso do ReadyZap
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380, 1fr))",
          gap: 16,
        }}
        className="training-grid"
      >
        {tutorials.map((t) => {
          const isOpen = expanded === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setExpanded(isOpen ? null : t.id)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: 20,
                cursor: "pointer",
                transition: "border-color .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 32 }}>{t.icon}</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f2f2ff", marginTop: 12 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(242,242,255,0.4)" }}>{t.description}</div>
                </div>
                {isOpen ? (
                  <ChevronUp size={16} style={{ color: "rgba(242,242,255,0.3)", flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={16} style={{ color: "rgba(242,242,255,0.3)", flexShrink: 0 }} />
                )}
              </div>

              {isOpen && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {t.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "rgba(59,130,246,0.1)",
                          color: "#60a5fa",
                          fontSize: 10,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 13, color: "rgba(242,242,255,0.6)", lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Training;
