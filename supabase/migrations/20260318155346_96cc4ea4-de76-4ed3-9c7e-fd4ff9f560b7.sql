CREATE OR REPLACE FUNCTION public.check_instance_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  instance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO instance_count
  FROM instances
  WHERE user_id = NEW.user_id;
  IF instance_count >= 10 THEN
    RAISE EXCEPTION 'Limite de instâncias atingido para seu plano (máx: 10). Faça upgrade.';
  END IF;
  RETURN NEW;
END;
$$;