-- Drop and recreate all INSERT policies for proposal submission

-- 1. Profiles table - allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;
CREATE POLICY "Public can insert profiles" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);

-- 2. Children table - allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can insert children for registration" ON public.children;
CREATE POLICY "Public can insert children" 
ON public.children 
FOR INSERT 
TO public
WITH CHECK (true);

-- 3. Storage - ensure anonymous can upload to photos bucket
DROP POLICY IF EXISTS "Anyone can upload photos for proposals" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to registrations folder" ON storage.objects;

CREATE POLICY "Public can upload photos" 
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'photos');

-- 4. Ensure photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;