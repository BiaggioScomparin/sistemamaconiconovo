-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create INSERT policy explicitly for anon and authenticated roles
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also ensure children table has the same
DROP POLICY IF EXISTS "Anyone can insert children for registration" ON public.children;

CREATE POLICY "Anyone can insert children for registration" 
ON public.children 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);