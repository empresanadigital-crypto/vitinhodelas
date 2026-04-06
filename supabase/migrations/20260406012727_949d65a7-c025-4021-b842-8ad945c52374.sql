DROP POLICY IF EXISTS "Users can delete own instances" ON public.instances;
CREATE POLICY "Users can delete own instances" ON public.instances 
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.campaign_jobs 
  DROP CONSTRAINT IF EXISTS campaign_jobs_instance_id_fkey;
ALTER TABLE public.campaign_jobs 
  ADD CONSTRAINT campaign_jobs_instance_id_fkey 
  FOREIGN KEY (instance_id) REFERENCES public.instances(id) 
  ON DELETE SET NULL;

ALTER TABLE public.campaign_logs
  DROP CONSTRAINT IF EXISTS campaign_logs_instance_id_fkey;
ALTER TABLE public.campaign_logs
  ADD CONSTRAINT campaign_logs_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES public.instances(id)
  ON DELETE SET NULL;