-- Fix storage bucket ownership controls

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create new policies with proper ownership checks
-- Users can only upload photos to their own folder (user_id/filename)
CREATE POLICY "Users can upload their own profile photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can only update their own photos
CREATE POLICY "Users can update their own photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can only delete their own photos
CREATE POLICY "Users can delete their own photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admins can manage all photos
CREATE POLICY "Admins can manage all photos"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'photos' AND
        public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
        bucket_id = 'photos' AND
        public.has_role(auth.uid(), 'admin'::public.app_role)
    );