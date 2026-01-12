-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a permissive policy that allows anyone to insert profiles for registration
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);