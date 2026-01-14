-- Drop the current policy
DROP POLICY IF EXISTS "Anyone can insert proposal profiles" ON public.profiles;

-- Create a new policy that explicitly allows anon and authenticated roles
CREATE POLICY "Anyone can insert proposal profiles"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (status IN ('proposta', 'pending'));