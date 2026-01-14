-- Drop current restrictive policy
DROP POLICY IF EXISTS "Anyone can submit proposals" ON public.profiles;

-- Create policy with full access for INSERT (no restrictions on status)
CREATE POLICY "Anyone can submit proposals"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);