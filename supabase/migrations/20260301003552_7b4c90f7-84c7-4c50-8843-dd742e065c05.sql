
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Coluna para controle de envios mensais
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS messages_sent_this_month INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS month_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now());
