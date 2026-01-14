-- Grant storage permissions to anon
GRANT SELECT, INSERT ON storage.objects TO anon;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;