-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can submit proposals" ON public.profiles;

-- Create new policy that only allows 'proposta' status
CREATE POLICY "Anyone can submit proposals"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'proposta');