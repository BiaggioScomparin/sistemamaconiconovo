-- Drop the old INSERT policy that requires authentication
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;

-- Create a policy that allows anyone to upload to registrations folder (for pre-registration)
CREATE POLICY "Anyone can upload to registrations folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = 'registrations');

-- Create a policy for authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload their photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = (auth.uid())::text);