
-- Drop e recria para garantir que estão ativos
DROP TRIGGER IF EXISTS trg_increment_message_usage ON public.campaign_jobs;
DROP TRIGGER IF EXISTS trg_enforce_message_limit ON public.campaign_jobs;
DROP TRIGGER IF EXISTS trg_enforce_instance_limit ON public.instances;

CREATE TRIGGER trg_increment_message_usage
  AFTER UPDATE ON public.campaign_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_message_usage();

CREATE TRIGGER trg_enforce_message_limit
  BEFORE INSERT ON public.campaign_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_limit();

CREATE TRIGGER trg_enforce_instance_limit
  BEFORE INSERT ON public.instances
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_instance_limit();
