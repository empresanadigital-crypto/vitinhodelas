
-- =============================================
-- BLOCO 1.1: TABELA campaign_jobs (substitui campaign_logs)
-- =============================================

CREATE TABLE public.campaign_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  instance_id uuid REFERENCES public.instances(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT campaign_jobs_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT campaign_jobs_status_check CHECK (
    status IN ('queued', 'processing', 'sent', 'failed', 'retry_scheduled', 'cancelled')
  )
);

-- Índices para o worker e consultas
CREATE INDEX idx_campaign_jobs_worker_poll ON public.campaign_jobs (status, scheduled_for) WHERE status IN ('queued', 'retry_scheduled');
CREATE INDEX idx_campaign_jobs_campaign_status ON public.campaign_jobs (campaign_id, status);
CREATE INDEX idx_campaign_jobs_user_status ON public.campaign_jobs (user_id, status);

-- RLS
ALTER TABLE public.campaign_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.campaign_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs"
  ON public.campaign_jobs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own jobs"
  ON public.campaign_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.campaign_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all jobs"
  ON public.campaign_jobs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- BLOCO 1.2: COLUNA settings jsonb EM profiles
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}';

-- =============================================
-- BLOCO 1.3: TRIGGER — incrementar usage ao marcar 'sent'
-- =============================================

CREATE OR REPLACE FUNCTION public.increment_message_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só incrementa quando status muda para 'sent'
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    UPDATE profiles
    SET messages_sent_this_month = messages_sent_this_month + 1,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_message_usage
  AFTER UPDATE ON public.campaign_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_message_usage();

-- =============================================
-- BLOCO 1.4: TRIGGER — enforcement de limite de mensagens no enqueue
-- =============================================

CREATE OR REPLACE FUNCTION public.enforce_message_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max_messages integer;
  _plan_slug text;
  _sent_this_month integer;
  _pending_jobs integer;
BEGIN
  -- Buscar plano do usuário
  SELECT COALESCE(p.slug, 'free'), COALESCE(p.max_messages_per_day, 100)
  INTO _plan_slug, _max_messages
  FROM profiles pr
  LEFT JOIN plans p ON pr.plan_id = p.id
  WHERE pr.id = NEW.user_id;

  -- Business = sem limite
  IF _plan_slug = 'business' THEN
    RETURN NEW;
  END IF;

  -- Buscar uso atual
  SELECT COALESCE(messages_sent_this_month, 0)
  INTO _sent_this_month
  FROM profiles
  WHERE id = NEW.user_id;

  -- Contar jobs pendentes (já enfileirados mas não enviados ainda)
  SELECT COUNT(*)
  INTO _pending_jobs
  FROM campaign_jobs
  WHERE user_id = NEW.user_id
    AND status IN ('queued', 'processing', 'retry_scheduled');

  -- Para plano free: limite mensal (max_messages_per_day = 100 = mensal)
  IF _plan_slug = 'free' OR _plan_slug IS NULL THEN
    IF (_sent_this_month + _pending_jobs) >= _max_messages THEN
      RAISE EXCEPTION 'Limite mensal de mensagens atingido (máx: %). Faça upgrade do plano.', _max_messages;
    END IF;
    RETURN NEW;
  END IF;

  -- Para plano pro: limite diário
  IF _plan_slug = 'pro' THEN
    DECLARE
      _sent_today integer;
      _pending_today integer;
    BEGIN
      SELECT COUNT(*) INTO _sent_today
      FROM campaign_jobs
      WHERE user_id = NEW.user_id
        AND status = 'sent'
        AND finished_at >= date_trunc('day', now());

      SELECT COUNT(*) INTO _pending_today
      FROM campaign_jobs
      WHERE user_id = NEW.user_id
        AND status IN ('queued', 'processing', 'retry_scheduled')
        AND created_at >= date_trunc('day', now());

      IF (_sent_today + _pending_today) >= _max_messages THEN
        RAISE EXCEPTION 'Limite diário de mensagens atingido (máx: %). Tente novamente amanhã.', _max_messages;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_message_limit
  BEFORE INSERT ON public.campaign_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_limit();

-- =============================================
-- BLOCO 1.5: TRIGGER — enforcement de limite de instâncias
-- =============================================

CREATE OR REPLACE FUNCTION public.enforce_instance_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _max_instances integer;
  _current_count integer;
BEGIN
  SELECT COALESCE(p.max_instances, 1)
  INTO _max_instances
  FROM profiles pr
  LEFT JOIN plans p ON pr.plan_id = p.id
  WHERE pr.id = NEW.user_id;

  IF _max_instances IS NULL THEN
    _max_instances := 1;
  END IF;

  SELECT COUNT(*)
  INTO _current_count
  FROM instances
  WHERE user_id = NEW.user_id;

  IF _current_count >= _max_instances THEN
    RAISE EXCEPTION 'Limite de instâncias atingido para seu plano (máx: %). Faça upgrade.', _max_instances;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_instance_limit
  BEFORE INSERT ON public.instances
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_instance_limit();

-- =============================================
-- BLOCO 1.6: Habilitar extensões para cron
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
