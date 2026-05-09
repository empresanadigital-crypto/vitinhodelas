import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Mail, Lock, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, authLoading, navigate]);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border-strong)] border-t-transparent" />
      </div>
    );
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        if (!name.trim()) throw new Error("Preencha seu nome");
        const phoneDigits = phone.replace(/\D/g, "");
        if (phoneDigits.length < 10) throw new Error("Informe seu número de WhatsApp com DDD");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), phone: phoneDigits },
          },
        });
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ phone: phoneDigits, full_name: name.trim() }).eq("id", user.id);
        }

        toast({
          title: "Conta criada! 🎉",
          description: "Você já pode começar a usar o ReadyZap Sender.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2 bg-[var(--bg)]">
      {/* ===== LADO ESQUERDO — FORMULARIO ===== */}
      <div className="relative flex flex-col bg-[var(--surface)] p-8 md:p-16">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-2.5 md:mb-16">
          <img
            src="/readyzap-logo.png"
            alt="ReadyZap"
            className="h-10 w-10 rounded-[9px] border-[1.5px] border-[var(--border-strong)]"
          />
          <div className="flex flex-col leading-none">
            <span className="text-[19px] font-bold text-[var(--text)] tracking-tight">ReadyZap</span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">SENDER</span>
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-[420px]">
          {/* Toggle Login/Cadastro */}
          <div className="mb-9 inline-flex rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-gray)] p-1 shadow-[var(--shadow-sm)]">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={[
                "rounded-lg border-[1.5px] px-[18px] py-[7px] text-[13px] font-semibold transition-all",
                isLogin
                  ? "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] shadow-[1px_1px_0_var(--border-strong)]"
                  : "border-transparent text-[var(--text-muted)]",
              ].join(" ")}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={[
                "rounded-lg border-[1.5px] px-[18px] py-[7px] text-[13px] font-semibold transition-all",
                !isLogin
                  ? "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] shadow-[1px_1px_0_var(--border-strong)]"
                  : "border-transparent text-[var(--text-muted)]",
              ].join(" ")}
            >
              Cadastrar
            </button>
          </div>

          {/* Title */}
          <h1 className="mb-3.5 text-[clamp(36px,4vw,48px)] font-medium leading-[1.05] tracking-[-0.03em] text-[var(--text)]">
            {isLogin ? (
              <>
                Acesse sua<br />conta
              </>
            ) : (
              <>
                Crie sua<br />conta grátis
              </>
            )}
          </h1>
          <p className="mb-10 text-[15px] leading-relaxed text-[var(--text-muted)]">
            {isLogin
              ? "Bem-vindo de volta. Entra para abrir o painel."
              : "Comece com 100 envios grátis. Sem cartão."}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <Field
                  label="Nome completo"
                  icon={User}
                  placeholder="Seu nome"
                  value={name}
                  onChange={setName}
                  required
                  maxLength={100}
                />
                <Field
                  label="WhatsApp"
                  icon={Phone}
                  type="tel"
                  placeholder="(41) 99999-9999"
                  value={phone}
                  onChange={(v) => setPhone(formatPhone(v))}
                  required
                />
              </>
            )}

            <Field
              label="Email"
              icon={Mail}
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={setEmail}
              required
              maxLength={255}
            />
            <Field
              label="Senha"
              icon={Lock}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              extraTopRight={
                isLogin ? (
                  <span className="text-[12px] font-semibold text-[var(--blue)] cursor-pointer hover:underline">
                    Esqueci minha senha
                  </span>
                ) : null
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--green)] px-6 py-3.5 text-[15px] font-bold text-[#1D1D1B] shadow-[var(--shadow-md)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-md)]"
            >
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta grátis"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* Legal */}
        <div className="mt-12 flex gap-5 text-[12px] text-[var(--text-muted)]">
          <a href="#" className="hover:text-[var(--text)] hover:underline">Termos</a>
          <a href="#" className="hover:text-[var(--text)] hover:underline">Privacidade</a>
          <a href="#" className="hover:text-[var(--text)] hover:underline">Suporte</a>
        </div>
      </div>

      {/* ===== LADO DIREITO — SHOWCASE ===== */}
      <div className="relative hidden flex-col justify-center overflow-hidden border-l-[1.5px] border-[var(--border-strong)] bg-[var(--pastel-green)] p-16 md:flex">
        <div className="max-w-[480px]">
          {/* Tag */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)] shadow-[1px_1px_0_var(--border-strong)]">
            <span className="inline-block h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--green-fn)]" />
            Plataforma de WhatsApp
          </div>

          {/* Headline */}
          <h2 className="mb-6 text-[clamp(36px,4vw,52px)] font-medium leading-[1.05] tracking-[-0.035em] text-[var(--text)]">
            Pare de tomar ban.<br />
            <span className="inline-block rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-2.5 leading-tight shadow-[2px_2px_0_var(--border-strong)]">
              Comece a vender.
            </span>
          </h2>

          {/* Bullets */}
          <div className="mb-9 flex flex-col gap-3.5">
            <Bullet>
              <strong>Multi-chip com rotação inteligente.</strong> Distribua envios entre vários chips automaticamente.
            </Bullet>
            <Bullet>
              <strong>Variações de mensagem.</strong> Reduza risco de ban enviando textos diferentes pra cada contato.
            </Bullet>
            <Bullet>
              <strong>Relatórios em tempo real.</strong> Acompanhe entrega, falhas e taxa de sucesso ao vivo.
            </Bullet>
          </div>

          {/* Mini mockup */}
          <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-1.5 border-b border-[var(--border-color)] bg-[var(--pastel-gray)] px-3 py-2.5">
              <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
              <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
              <span className="h-2 w-2 rounded-full bg-[#28C840]" />
              <span className="ml-2.5 font-mono text-[9.5px] text-[var(--text-muted)]">app.readysender.com/dashboard</span>
            </div>
            <div className="p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[12px] font-bold text-[var(--text)]">Disparos em andamento</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--green-dark)]">
                  <span className="inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-[var(--green-fn)]" />
                  AO VIVO
                </span>
              </div>
              {[
                { ph: "+55 11 9****-2647", pct: 78 },
                { ph: "+55 11 9****-3318", pct: 45 },
                { ph: "+55 11 9****-8821", pct: 92 },
              ].map((row, i) => (
                <div key={i} className="mb-1 flex items-center gap-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--pastel-gray)] px-2.5 py-2">
                  <span className="min-w-[100px] font-mono text-[10px] text-[var(--text)]">{row.ph}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(29,29,27,0.08)]">
                    <span className="block h-full rounded-full bg-[var(--green-fn)]" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="min-w-[28px] text-right text-[10px] font-bold text-[var(--text)]">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Field component ===== */
function Field({
  label,
  icon: Icon,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  maxLength,
  extraTopRight,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  extraTopRight?: React.ReactNode;
}) {
  return (
    <div className="mb-[18px]">
      <div className="mb-[7px] flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text)]">{label}</label>
        {extraTopRight}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          className="w-full rounded-[10px] border-[1.5px] border-[var(--border-strong)] bg-[var(--surface)] px-[15px] py-3 pl-10 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[var(--shadow-sm)]"
        />
      </div>
    </div>
  );
}

/* ===== Bullet component ===== */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--text)]">
      <span className="mt-0.5 inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--green)]">
        <Check className="h-3.5 w-3.5 text-[#1D1D1B]" strokeWidth={2.5} />
      </span>
      <div>{children}</div>
    </div>
  );
}

export default Auth;
