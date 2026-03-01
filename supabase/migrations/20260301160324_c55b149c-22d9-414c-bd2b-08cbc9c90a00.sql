
-- =============================================
-- Colunas worker_id e locked_at em campaign_jobs
-- =============================================
ALTER TABLE public.campaign_jobs
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- =============================================
-- RPC: claim_campaign_jobs
-- Lock atômico com FOR UPDATE SKIP LOCKED
-- =============================================
CREATE OR REPLACE FUNCTION public.claim_campaign_jobs(
  p_batch_size integer DEFAULT 10,
  p_worker_id text DEFAULT 'default'
)
RETURNS SETOF public.campaign_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT cj.id
    FROM campaign_jobs cj
    INNER JOIN campaigns c ON c.id = cj.campaign_id AND c.status = 'sending'
    WHERE cj.status IN ('queued', 'retry_scheduled')
      AND cj.scheduled_for <= now()
    ORDER BY cj.scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE OF cj SKIP LOCKED
  )
  UPDATE campaign_jobs
  SET status = 'processing',
      started_at = now(),
      worker_id = p_worker_id,
      locked_at = now()
  FROM claimable
  WHERE campaign_jobs.id = claimable.id
  RETURNING campaign_jobs.*;
END;
$$;

-- =============================================
-- RPC: increment_campaign_counts
-- Increment atômico de sent_count / failed_count
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_campaign_counts(
  p_campaign_id uuid,
  p_sent_delta integer DEFAULT 0,
  p_failed_delta integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE campaigns
  SET sent_count = sent_count + p_sent_delta,
      failed_count = failed_count + p_failed_delta,
      updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;

-- =============================================
-- RPC: reap_stale_jobs
-- Re-enfileira jobs travados há mais de 10 min
-- Incrementa attempts; se >= max_attempts, marca failed
-- =============================================
CREATE OR REPLACE FUNCTION public.reap_stale_jobs(
  p_stale_minutes integer DEFAULT 10
)
RETURNS TABLE(reaped_id uuid, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Jobs que ainda podem ser retentados
  RETURN QUERY
  UPDATE campaign_jobs
  SET status = 'queued',
      started_at = NULL,
      worker_id = NULL,
      locked_at = NULL,
      attempts = attempts + 1,
      last_error = 'requeued_stale_processing'
  WHERE status = 'processing'
    AND started_at < now() - (p_stale_minutes || ' minutes')::interval
    AND attempts + 1 < max_attempts
  RETURNING id AS reaped_id, 'queued'::text AS new_status;

  -- Jobs que excederam max_attempts → falha definitiva
  RETURN QUERY
  UPDATE campaign_jobs
  SET status = 'failed',
      finished_at = now(),
      attempts = attempts + 1,
      last_error = 'max_attempts_exceeded_after_stale'
  WHERE status = 'processing'
    AND started_at < now() - (p_stale_minutes || ' minutes')::interval
    AND attempts + 1 >= max_attempts
  RETURNING id AS reaped_id, 'failed'::text AS new_status;
END;
$$;
