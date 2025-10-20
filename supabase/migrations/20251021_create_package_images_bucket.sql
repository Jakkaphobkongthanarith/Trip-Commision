-- Create package-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for package-images bucket
CREATE POLICY IF NOT EXISTS "Public read access for package images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'package-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload package images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'package-images' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can update package images" 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'package-images' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete package images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'package-images' AND auth.role() = 'authenticated');