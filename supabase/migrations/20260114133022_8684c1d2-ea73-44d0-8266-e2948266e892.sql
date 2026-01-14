-- Drop the existing policy that allows anon inserts
DROP POLICY IF EXISTS "Anyone can submit proposals" ON public.profiles;

-- Create new policy that allows authenticated users to submit proposals
CREATE POLICY "Authenticated users can submit proposals"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (status = 'proposta');

-- Also allow authenticated users to read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR status = 'proposta');