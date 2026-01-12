-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a new PERMISSIVE INSERT policy for ALL roles (public, anon, authenticated)
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);