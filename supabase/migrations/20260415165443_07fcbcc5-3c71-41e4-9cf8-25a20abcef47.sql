
-- Add image_url column to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Campaign images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload campaign images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own images
CREATE POLICY "Users can update own campaign images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'campaign-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own images
CREATE POLICY "Users can delete own campaign images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-images' AND auth.uid()::text = (storage.foldername(name))[1]);
