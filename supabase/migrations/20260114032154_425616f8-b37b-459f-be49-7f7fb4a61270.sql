-- Drop and recreate the policy with explicit role
DROP POLICY IF EXISTS "Public can submit proposals" ON public.profiles;

-- Create policy explicitly for anon and authenticated roles
CREATE POLICY "Anyone can submit proposals"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (status IN ('proposta', 'pending'));