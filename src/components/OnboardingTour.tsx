import { useNavigate } from "react-router-dom";

interface OnboardingTourProps {
  onClose: () => void;
  hasInstances: boolean;
  hasContacts: boolean;
  hasCampaigns: boolean;
}

const steps = [
  {
    number: "01",
    title: "Conecte seu WhatsApp",
    description: "Escaneie o QR Code para conectar seu chip",
    icon: "📱",
    route: "/instancias",
  },
  {
    number: "02",
    title: "Importe seus contatos",
    description: "CSV, Excel ou cole manualmente",
    icon: "👥",
    route: "/contatos",
  },
  {
    number: "03",
    title: "Crie sua primeira campanha",
    description: "Escreva, personalize e dispare",
    icon: "🚀",
    route: "/campanhas",
  },
];

const OnboardingTour = ({ onClose, hasInstances, hasContacts, hasCampaigns }: OnboardingTourProps) => {
  const navigate = useNavigate();

  if (hasInstances || hasContacts || hasCampaigns) return null;

  const handleStep = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#0a0b11",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          maxWidth: 480,
          width: "90%",
          marginTop: "15vh",
          overflow: "hidden",
        }}
      >
        {/* Gradient line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, #3b82f6, #18f26a)" }} />

        <div style={{ padding: 32 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48 }}>🚀</div>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#f2f2ff",
                marginTop: 16,
              }}
            >
              Bem-vindo ao ReadyZap!
            </h2>
            <p style={{ fontSize: 14, color: "rgba(242,242,255,0.5)", marginTop: 8 }}>
              Vamos configurar tudo em 3 passos rápidos
            </p>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {steps.map((step) => (
              <div
                key={step.number}
                onClick={() => handleStep(step.route)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                <span style={{ fontSize: 28 }}>{step.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.04em", marginBottom: 2 }}>
                    {step.number}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f2f2ff" }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(242,242,255,0.4)" }}>{step.description}</div>
                </div>
                <span style={{ color: "rgba(242,242,255,0.2)", fontSize: 18 }}>→</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => handleStep("/instancias")}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #3b82f6, #18f26a)",
              color: "#fff",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            Começar →
          </button>

          <p
            onClick={onClose}
            style={{
              fontSize: 12,
              color: "rgba(242,242,255,0.3)",
              cursor: "pointer",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            Pular tour
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
