import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Zap,
  Users,
  BarChart3,
  Shield,
  Clock,
  ChevronRight,
  Check,
  Star,
  ArrowRight,
  Smartphone,
  Rocket,
  Bot,
  Send,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);

  const features = [
    { icon: Send, title: "Disparo em Massa", desc: "Envie milhares de mensagens com intervalo inteligente e rotação de chips automática." },
    { icon: Smartphone, title: "Multi-Chip", desc: "Conecte até 10 números WhatsApp por conta e distribua os envios entre eles." },
    { icon: Users, title: "Gestão de Contatos", desc: "Importe contatos via CSV, organize por tags e segmente suas campanhas." },
    { icon: BarChart3, title: "Relatórios em Tempo Real", desc: "Acompanhe entregas, falhas e métricas de cada campanha ao vivo." },
    { icon: Shield, title: "Anti-Ban Inteligente", desc: "Intervalos aleatórios, rotação de instâncias e limites por chip para proteger seus números." },
    { icon: Clock, title: "Agendamento", desc: "Programe campanhas para o horário ideal e deixe o sistema trabalhar por você." },
  ];

  const plans = [
    {
      name: "Grátis",
      price: "0",
      popular: false,
      features: [
        "1 número WhatsApp",
        "100 envios/mês",
        "Importação CSV",
        "Relatórios básicos",
      ],
    },
    {
      name: "Pro",
      price: "27",
      popular: true,
      features: [
        "3 números WhatsApp",
        "Envios ilimitados",
        "Rotação de chips",
        "Relatórios avançados",
        "Agendamento",
        "Variáveis dinâmicas",
        "Suporte prioritário",
      ],
    },
    {
      name: "Business",
      price: "97",
      popular: false,
      features: [
        "10 números WhatsApp",
        "Envios ilimitados",
        "Tudo do Pro",
        "Anti-ban avançado",
        "Gerente dedicado",
        "Setup assistido",
      ],
    },
  ];

  const testimonials = [
    { name: "Carlos M.", role: "Dono de E-commerce", text: "Triplicamos nossas vendas em 2 meses usando o ReadyZap. O disparo em massa com rotação de chips é game changer.", stars: 5 },
    { name: "Ana Paula S.", role: "Corretora de Imóveis", text: "Antes eu gastava 3h por dia enviando mensagens manualmente. Agora configuro a campanha e deixo rodar.", stars: 5 },
    { name: "Ricardo L.", role: "Infoprodutor", text: "Já testei várias ferramentas e o ReadyZap é a única que não bane meus chips. O anti-ban funciona de verdade.", stars: 5 },
  ];

  const faqs = [
    { q: "Meu número pode ser banido?", a: "O ReadyZap possui sistema anti-ban com intervalos aleatórios, rotação de chips e limites inteligentes. Seguindo as boas práticas, o risco é mínimo." },
    { q: "Preciso ter mais de um chip?", a: "Não é obrigatório, mas recomendamos. Com mais chips, você distribui o volume e reduz o risco por número." },
    { q: "Como funciona a importação de contatos?", a: "Basta fazer upload de um arquivo CSV com nome e telefone. O sistema importa e organiza automaticamente." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim! Sem fidelidade, sem multa. Cancele quando quiser direto no painel." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Ready<span className="text-primary">Zap</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">Recursos</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition hover:text-foreground">Planos</a>
            <a href="#testimonials" className="text-sm text-muted-foreground transition hover:text-foreground">Depoimentos</a>
            <a href="#faq" className="text-sm text-muted-foreground transition hover:text-foreground">FAQ</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Entrar</Button>
            <Button size="sm" className="gradient-blue text-primary-foreground font-semibold" onClick={() => navigate("/auth")}>
              Começar Grátis <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-sm text-muted-foreground" onClick={() => setMobileMenu(false)}>Recursos</a>
              <a href="#pricing" className="text-sm text-muted-foreground" onClick={() => setMobileMenu(false)}>Planos</a>
              <a href="#testimonials" className="text-sm text-muted-foreground" onClick={() => setMobileMenu(false)}>Depoimentos</a>
              <a href="#faq" className="text-sm text-muted-foreground" onClick={() => setMobileMenu(false)}>FAQ</a>
              <Button className="gradient-blue text-primary-foreground font-semibold w-full" onClick={() => navigate("/auth")}>
                Começar Grátis
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Rocket className="h-3.5 w-3.5" /> Plataforma #1 de Disparo WhatsApp
            </span>
          </motion.div>

          <motion.h1
            className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Dispare mensagens no
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              WhatsApp em escala
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Automatize seus envios, conecte múltiplos chips e alcance milhares de clientes
            com a plataforma mais segura e inteligente do mercado.
          </motion.p>

          <motion.div
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Button
              size="lg"
              className="gradient-blue text-primary-foreground font-bold text-base px-8 py-6 glow-blue"
              onClick={() => navigate("/auth")}
            >
              Começar Agora — É Grátis <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border/60 px-8 py-6 text-base"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              Ver Recursos
            </Button>
          </motion.div>

          <motion.div
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
            initial="hidden" animate="visible" variants={fadeUp} custom={4}
          >
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Setup em 2 minutos</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Suporte humanizado</span>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {[
            { value: "2M+", label: "Mensagens enviadas" },
            { value: "500+", label: "Clientes ativos" },
            { value: "99.2%", label: "Taxa de entrega" },
            { value: "24/7", label: "Suporte disponível" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
            >
              <div className="text-3xl font-extrabold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-16 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Recursos</span>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Tudo que você precisa para vender mais</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Uma plataforma completa para disparos em massa no WhatsApp com segurança e inteligência.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass-card rounded-xl p-6 transition-all hover:border-primary/30 hover:glow-blue"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/50 bg-card/30 py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div className="mb-16 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Como Funciona</span>
            <h2 className="text-3xl font-extrabold sm:text-4xl">3 passos para começar a disparar</h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", icon: Smartphone, title: "Conecte seus chips", desc: "Escaneie o QR Code e conecte quantos números quiser ao painel." },
              { step: "02", icon: Users, title: "Importe contatos", desc: "Suba seu CSV ou cadastre manualmente. Organize por tags." },
              { step: "03", icon: Rocket, title: "Dispare!", desc: "Configure a mensagem, selecione os contatos e clique em iniciar." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                className="relative text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-blue">
                  <s.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-6xl font-black text-primary/5">{s.step}</span>
                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-16 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Planos</span>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Escolha o plano ideal</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Comece grátis e faça upgrade quando precisar. Sem surpresas.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "border-2 border-primary glow-blue bg-card"
                    : "glass-card"
                }`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-blue px-4 py-1 text-xs font-bold text-primary-foreground">
                    MAIS POPULAR
                  </span>
                )}
                <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
                <div className="mb-6">
                  {plan.price === "0" ? (
                    <span className="text-4xl font-extrabold">Grátis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold">R${plan.price}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </>
                  )}
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-semibold ${
                    plan.popular
                      ? "gradient-blue text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  onClick={() => navigate("/auth")}
                >
                  {plan.price === "0" ? "Começar Grátis" : plan.popular ? "Começar Agora" : "Escolher Plano"}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-y border-border/50 bg-card/30 py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div className="mb-16 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Depoimentos</span>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Quem usa, recomenda</h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="glass-card rounded-xl p-6"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <motion.div className="mb-16 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">FAQ</span>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Perguntas frequentes</h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.details
                key={faq.q}
                className="glass-card group rounded-xl"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-semibold">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-border/50 px-5 pb-5 pt-3 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <motion.div
          className="mx-auto max-w-4xl rounded-3xl gradient-blue p-12 text-center md:p-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <h2 className="mb-4 text-3xl font-extrabold text-primary-foreground sm:text-4xl">
            Pronto para escalar suas vendas?
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-primary-foreground/80">
            Junte-se a mais de 500 empresas que já usam o ReadyZap para alcançar seus clientes no WhatsApp.
          </p>
          <Button
            size="lg"
            className="bg-primary-foreground text-primary font-bold text-base px-10 py-6 hover:bg-primary-foreground/90"
            onClick={() => navigate("/auth")}
          >
            Criar Minha Conta Grátis <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Ready<span className="text-primary">Zap</span></span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition">Termos</a>
            <a href="#" className="hover:text-foreground transition">Privacidade</a>
            <a href="#" className="hover:text-foreground transition">Contato</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 ReadyZap. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
