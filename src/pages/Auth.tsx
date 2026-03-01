import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Mail, Lock, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        if (phoneDigits.length < 10) throw new Error("WhatsApp inválido. Use DDD + número");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), phone: phoneDigits },
          },
        });
        if (error) throw error;

        // Update profile with phone
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ phone: phoneDigits, full_name: name.trim() }).eq("id", user.id);
        }

        toast({
          title: "Conta criada! 🎉",
          description: "Você já pode começar a usar o ReadyZap gratuitamente.",
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl gradient-green mb-4">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ReadyZap</h1>
          <p className="text-muted-foreground mt-1">
            {isLogin ? "Entre na sua conta" : "Crie sua conta grátis"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label className="text-foreground">Nome completo</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary border-border text-foreground pl-10"
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground">WhatsApp</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="bg-secondary border-border text-foreground pl-10"
                    required
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <Label className="text-foreground">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border text-foreground pl-10"
                required
                maxLength={255}
              />
            </div>
          </div>
          <div>
            <Label className="text-foreground">Senha</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border text-foreground pl-10"
                required
                minLength={6}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full gradient-green text-primary-foreground font-semibold"
          >
            {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta Grátis"}
          </Button>

          {!isLogin && (
            <p className="text-center text-xs text-muted-foreground">
              Você começa no plano Grátis com 100 envios/mês
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Cadastre-se grátis" : "Faça login"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
