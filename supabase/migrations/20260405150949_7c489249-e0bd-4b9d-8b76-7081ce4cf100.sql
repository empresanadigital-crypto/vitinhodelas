
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
  SELECT COALESCE(p.slug, 'free'), COALESCE(p.max_messages_per_day, 200)
  INTO _plan_slug, _max_messages
  FROM profiles pr
  LEFT JOIN plans p ON pr.plan_id = p.id
  WHERE pr.id = NEW.user_id;

  -- Pro e Business = sem limite (999999)
  IF _plan_slug = 'pro' OR _plan_slug = 'business' THEN
    RETURN NEW;
  END IF;

  -- Free: limite mensal de 200
  SELECT COALESCE(messages_sent_this_month, 0)
  INTO _sent_this_month
  FROM profiles
  WHERE id = NEW.user_id;

  SELECT COUNT(*)
  INTO _pending_jobs
  FROM campaign_jobs
  WHERE user_id = NEW.user_id
    AND status IN ('queued', 'processing', 'retry_scheduled');

  IF (_sent_this_month + _pending_jobs) >= _max_messages THEN
    RAISE EXCEPTION 'Limite mensal de % mensagens atingido. Faça upgrade do plano para continuar enviando.', _max_messages;
  END IF;

  RETURN NEW;
END;
$$;

-- Set admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'empresa.nadigital@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
