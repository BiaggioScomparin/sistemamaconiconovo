-- Drop the existing policy that may be causing issues
DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;

-- Create a more permissive policy for proposals
-- Allow anyone (authenticated or not) to insert profiles with status 'proposta' or 'pending'
CREATE POLICY "Anyone can insert proposal profiles"
ON public.profiles
FOR INSERT
WITH CHECK (status IN ('proposta', 'pending'));