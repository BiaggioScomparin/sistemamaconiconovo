-- Create storage policy to allow anonymous uploads to the photos bucket
CREATE POLICY "Anyone can upload photos for proposals" 
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'photos');

-- Create storage policy to allow reading photos publicly
CREATE POLICY "Anyone can read photos" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'photos');