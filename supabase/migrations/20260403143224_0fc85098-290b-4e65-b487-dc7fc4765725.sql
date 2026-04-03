-- Remover função com limite hardcoded e seus triggers
DROP TRIGGER IF EXISTS trg_check_instance_limit ON public.instances;
DROP FUNCTION IF EXISTS public.check_instance_limit() CASCADE;

-- Recriar trigger usando apenas enforce_instance_limit (que consulta o plano)
DROP TRIGGER IF EXISTS trg_enforce_instance_limit ON public.instances;

CREATE TRIGGER trg_enforce_instance_limit
  BEFORE INSERT ON public.instances
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_instance_limit();