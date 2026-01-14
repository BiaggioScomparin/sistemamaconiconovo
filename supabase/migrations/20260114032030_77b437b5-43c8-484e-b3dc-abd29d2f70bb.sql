-- Drop existing insert policies
DROP POLICY IF EXISTS "Anyone can insert proposal profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON public.profiles;

-- Create a single, simple policy for public proposal submissions
-- Using TRUE for roles means it applies to all connections
CREATE POLICY "Public can submit proposals"
ON public.profiles
FOR INSERT
WITH CHECK (status IN ('proposta', 'pending'));

-- Ensure anon role can use the table
GRANT ALL ON public.profiles TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;