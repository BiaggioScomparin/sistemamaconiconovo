-- First, let's grant necessary permissions to anon role
GRANT INSERT ON public.profiles TO anon;
GRANT INSERT ON public.children TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Also grant to authenticated role
GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.children TO authenticated;

-- Recreate the INSERT policy with explicit anon role
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;
CREATE POLICY "Anon can insert profiles" 
ON public.profiles 
FOR INSERT 
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert children" ON public.children;
CREATE POLICY "Anon can insert children" 
ON public.children 
FOR INSERT 
TO anon
WITH CHECK (true);