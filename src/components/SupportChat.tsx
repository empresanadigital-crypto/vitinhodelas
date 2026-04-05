import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";

const quickFaqs = [
  { id: "1", q: "Como conectar meu WhatsApp?", a: "Vá em Instâncias → Nova Instância → Escolha Z-API ou Disparo Pro → Escaneie o QR Code. Em 30 segundos está conectado." },
  { id: "2", q: "Meu chip pode ser banido?", a: "Usamos rotação automática e intervalo inteligente entre envios. Siga as boas práticas e o risco é mínimo." },
  { id: "3", q: "Como importar contatos?", a: "Vá em Contatos → Importar → Cole o texto com nome e número, ou faça upload de CSV/Excel." },
  { id: "4", q: "Qual o limite do plano gratuito?", a: "200 mensagens por mês e 1 chip WhatsApp. Faça upgrade pro Pro para envios ilimitados." },
];

const SupportChat = () => {
  const [open, setOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="support-chat-btn"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9998,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6, #18f26a)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
          transition: "transform .15s",
          color: "#fff",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 24,
            zIndex: 9998,
            width: 340,
            maxHeight: 480,
            background: "#0a0b11",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Gradient line */}
          <div style={{ height: 2, background: "linear-gradient(90deg, #3b82f6, #18f26a)" }} />

          {/* Header */}
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f2f2ff" }}>ReadyZap Suporte</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 10, color: "rgba(242,242,255,0.4)" }}>Online agora</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(242,242,255,0.4)", cursor: "pointer", padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* FAQ list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {quickFaqs.map((faq) => (
              <div key={faq.id}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(242,242,255,0.6)",
                    cursor: "pointer",
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                >
                  {faq.q}
                </button>
                {expandedFaq === faq.id && (
                  <div style={{ fontSize: 12, color: "rgba(242,242,255,0.4)", padding: "8px 12px", lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer buttons */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => window.open("https://wa.me/5541999999999?text=Preciso de ajuda com o ReadyZap Sender", "_blank")}
              style={{
                width: "100%",
                padding: "10px",
                background: "#25D366",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              💬 Falar com suporte humano
            </button>
            <button
              onClick={() => { navigate("/treinamentos"); setOpen(false); }}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
                color: "rgba(242,242,255,0.5)",
                cursor: "pointer",
              }}
            >
              📚 Ver tutoriais
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChat;
