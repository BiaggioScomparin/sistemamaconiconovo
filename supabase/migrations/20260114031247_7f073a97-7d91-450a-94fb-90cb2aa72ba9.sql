-- Drop existing conflicting policy and create one for anon
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload photos" ON storage.objects;

-- Create policy allowing anon to upload to photos bucket
CREATE POLICY "Anon can upload photos"
ON storage.objects
FOR INSERT
TO anon, authenticated, public
WITH CHECK (bucket_id = 'photos');