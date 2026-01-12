-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a new PERMISSIVE INSERT policy for public registration
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);