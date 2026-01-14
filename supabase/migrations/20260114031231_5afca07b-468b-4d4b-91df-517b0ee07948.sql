-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (important!)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Grant all necessary permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Also grant usage on the schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;