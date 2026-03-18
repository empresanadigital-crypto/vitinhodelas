ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS selected_instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL;