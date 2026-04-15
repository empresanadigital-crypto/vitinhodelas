import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/campanhas", { replace: true });
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
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#08090e' }}><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
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
        navigate("/campanhas");
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
          description: "Você já pode começar a usar o ReadyZap gratuitamente.",
        });
        navigate("/campanhas");
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
    <>
      <style>{`
        @keyframes auth-shimmer {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(400%) skewX(-15deg); }
        }
        @keyframes auth-spin {
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
      `}</style>

      <div className="auth-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', background: '#08090e' }}>
        {/* LEFT — FORM */}
        <div className="auth-form-panel" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 72px', background: '#08090e',
          borderRight: '1px solid rgba(255,255,255,.05)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* subtle glow */}
          <div style={{
            position: 'absolute', top: -100, left: -100, width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #3b82f6, #18f26a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 4,
            }}>
              ReadyZap
            </h2>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: 'rgba(242,242,255,0.25)',
            }}>
              SENDER
            </p>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(28px, 3vw, 38px)', fontWeight: 800,
            color: '#f2f2ff', letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 8,
          }}>
            {isLogin ? <>Entre na<br/>sua conta</> : <>Crie sua<br/>conta grátis</>}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(242,242,255,.4)', marginBottom: 36 }}>
            {isLogin ? 'Acesse o painel e comece a disparar.' : 'Comece gratuitamente com 100 envios/mês.'}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <FieldInput label="NOME COMPLETO" icon="user" placeholder="Seu nome" value={name} onChange={setName} required maxLength={100} />
                <FieldInput label="WHATSAPP" icon="phone" placeholder="(41) 99999-9999" value={phone} onChange={(v) => setPhone(formatPhone(v))} required />
              </>
            )}

            <FieldInput label="EMAIL" icon="mail" placeholder="seu@email.com" type="email" value={email} onChange={setEmail} required maxLength={255} />
            <FieldInput label="SENHA" icon="lock" placeholder="••••••••" type="password" value={password} onChange={setPassword} required minLength={6} />

            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -10, marginBottom: 28 }}>
                <span style={{ fontSize: 12, color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>Esqueci minha senha</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 50, borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #18f26a)',
                color: '#fff', fontFamily: "'Outfit', sans-serif",
                fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                letterSpacing: '-0.01em', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                opacity: loading ? 0.7 : 1, transition: 'all .2s',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>
                {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta Grátis"}
              </span>
              <div style={{
                position: 'absolute', top: 0, left: 0, width: 40, height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent)',
                animation: 'auth-shimmer 3.5s ease-in-out infinite 1s',
              }} />
            </button>

            {/* Toggle */}
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(242,242,255,.4)' }}>
              {isLogin ? "Não tem conta? " : "Já tem conta? "}
              <span
                onClick={() => setIsLogin(!isLogin)}
                style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
              >
            {isLogin ? "Cadastre-se grátis" : "Faça login"}
              </span>
            </p>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <a
                href="https://readysender.com.br/"
                style={{ fontSize: 12, color: 'rgba(242,242,255,0.3)', textDecoration: 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(242,242,255,0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(242,242,255,0.3)'}
              >
                ← Voltar ao site
              </a>
            </div>
          </form>
        </div>

        {/* RIGHT — BRAND */}
        <div className="auth-brand-panel" style={{
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 72px', background: '#08090e',
        }}>
          {/* gradient mesh */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              radial-gradient(ellipse 80% 60% at 20% 20%, rgba(59,130,246,.25) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 80%, rgba(24,242,106,.18) 0%, transparent 60%),
              radial-gradient(ellipse 50% 50% at 50% 50%, rgba(59,130,246,.08) 0%, transparent 70%)
            `,
            pointerEvents: 'none',
          }} />

          {/* orb */}
          <div style={{
            position: 'absolute', top: '30%', left: '40%',
            width: 500, height: 500, transform: 'translate(-50%, -50%)',
            background: 'conic-gradient(from 0deg, rgba(59,130,246,.12) 0%, rgba(24,242,106,.1) 33%, rgba(59,130,246,.08) 66%, rgba(24,242,106,.12) 100%)',
            borderRadius: '50%', animation: 'auth-spin 20s linear infinite',
            pointerEvents: 'none', filter: 'blur(40px)',
          }} />

          {/* grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px', pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase' as const, color: '#60a5fa',
              display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <span style={{ width: 20, height: 1, background: '#60a5fa', opacity: 0.5, display: 'inline-block' }} />
              Plataforma de WhatsApp
            </div>

            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(36px, 3.5vw, 54px)', fontWeight: 800,
              letterSpacing: '-0.035em', lineHeight: 1.06,
              color: '#f2f2ff', marginBottom: 20,
            }}>
              Dispare no WhatsApp.<br/>
              <span style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #18f26a 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Sem ban. Em escala.
              </span>
            </h2>

            <p style={{ fontSize: 15, color: 'rgba(242,242,255,.4)', lineHeight: 1.75, maxWidth: 380, marginBottom: 40 }}>
              Multi-chip, anti-ban inteligente e relatórios em tempo real. Tudo que você precisa para alcançar milhares de clientes com segurança.
            </p>

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 12, overflow: 'hidden', marginBottom: 36,
            }}>
              {[
                { n: '2', em: 'M+', l: 'Mensagens enviadas' },
                { n: '99', em: '%', l: 'Taxa de entrega' },
                { n: '500', em: '+', l: 'Clientes ativos' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(8,9,14,.7)', backdropFilter: 'blur(12px)', padding: '18px 16px' }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
                    background: 'linear-gradient(160deg, #ffffff 20%, rgba(200,210,255,0.5) 60%, rgba(242,242,255,0.15))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    lineHeight: 1, marginBottom: 4,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {s.n}<span style={{ WebkitTextFillColor: '#60a5fa' }}>{s.em}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(242,242,255,.22)' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div style={{
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 12, padding: 20, backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 11, color: '#f59e0b', letterSpacing: 2, marginBottom: 10 }}>★★★★★</div>
              <p style={{ fontSize: 14, color: 'rgba(242,242,255,.4)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 14 }}>
                "Triplicamos as vendas no primeiro mês. A personalização é impressionante e nunca mais perdemos um chip por banimento."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(59,130,246,.3), rgba(24,242,106,.2))',
                  border: '1px solid rgba(59,130,246,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#60a5fa',
                }}>
                  CM
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f2f2ff', fontFamily: "'Outfit', sans-serif" }}>Carlos M.</div>
                  <div style={{ fontSize: 11, color: 'rgba(242,242,255,.22)' }}>Consultor de Vendas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* Reusable field component */
const iconPaths: Record<string, JSX.Element> = {
  mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
};

function FieldInput({ label, icon, placeholder, type = "text", value, onChange, required, minLength, maxLength }: {
  label: string; icon: string; placeholder: string; type?: string;
  value: string; onChange: (v: string) => void; required?: boolean; minLength?: number; maxLength?: number;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'rgba(242,242,255,.4)', letterSpacing: '.05em',
        textTransform: 'uppercase' as const, marginBottom: 7,
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <svg
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(242,242,255,.22)', pointerEvents: 'none' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          {iconPaths[icon]}
        </svg>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,.06)', borderRadius: 8,
            padding: '13px 14px 13px 40px', fontSize: 13,
            color: '#f2f2ff', fontFamily: "'Outfit', sans-serif",
            outline: 'none', transition: 'border-color .15s, box-shadow .15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(59,130,246,.5)';
            e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,.06)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>
  );
}

export default Auth;
