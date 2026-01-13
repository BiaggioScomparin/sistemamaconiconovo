-- Create storage bucket for library files
INSERT INTO storage.buckets (id, name, public)
VALUES ('library', 'library', true);

-- Allow admins to upload files
CREATE POLICY "Admins can upload library files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'library' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update files
CREATE POLICY "Admins can update library files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'library' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete library files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'library' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to view library files
CREATE POLICY "Authenticated users can view library files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'library' AND
  auth.role() = 'authenticated'
);