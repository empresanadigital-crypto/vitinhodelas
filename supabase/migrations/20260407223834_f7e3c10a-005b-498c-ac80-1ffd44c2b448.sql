
-- Allow users to update their own campaign_logs (needed to null out instance_id before deleting instance)
CREATE POLICY "Users can update own logs"
ON public.campaign_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own campaign_jobs (needed for cleanup)
CREATE POLICY "Users can delete own jobs"
ON public.campaign_jobs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
