ALTER TABLE public.campaign_logs
  DROP CONSTRAINT IF EXISTS campaign_logs_instance_id_fkey;

ALTER TABLE public.campaign_logs
  ADD CONSTRAINT campaign_logs_instance_id_fkey
  FOREIGN KEY (instance_id)
  REFERENCES public.instances(id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION check_instance_limit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;