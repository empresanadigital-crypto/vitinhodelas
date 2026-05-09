-- 1. Funções: Segurança e Permissões
-- Revoga execução pública e define search_path para todas
DO $$ 
DECLARE 
  f RECORD;
BEGIN
  -- Lista de funções para aplicar o endurecimento
  FOR f IN (SELECT proname, pg_get_function_identity_arguments(oid) as args 
            FROM pg_proc WHERE proname IN (
              'claim_campaign_jobs', 'reap_stale_jobs', 'increment_campaign_counts', 
              'has_role', 'handle_new_user', 'enforce_instance_limit', 
              'enforce_message_limit', 'increment_message_usage', 'reset_monthly_message_counts'
            )) 
  LOOP
    -- Garante search_path=public
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', f.proname, f.args);
    -- Revoga de PUBLIC
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', f.proname, f.args);
  END LOOP;
END $$;

-- 2. Concede permissões específicas
-- Trabalhadores e API
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_campaign_jobs(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reap_stale_jobs(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_counts(uuid, integer, integer) TO authenticated, service_role;

-- Cron
GRANT EXECUTE ON FUNCTION public.reset_monthly_message_counts() TO postgres, service_role;

-- Triggers do Postgres
GRANT EXECUTE ON FUNCTION public.enforce_instance_limit() TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_message_limit() TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_message_usage() TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;