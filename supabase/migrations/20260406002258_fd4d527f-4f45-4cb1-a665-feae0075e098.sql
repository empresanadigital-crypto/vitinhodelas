CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.reset_monthly_message_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET messages_sent_this_month = 0,
      month_reset_at = now(),
      updated_at = now()
  WHERE messages_sent_this_month > 0;
END;
$$;

SELECT cron.schedule(
  'reset-monthly-messages',
  '0 0 1 * *',
  $$SELECT public.reset_monthly_message_counts()$$
);