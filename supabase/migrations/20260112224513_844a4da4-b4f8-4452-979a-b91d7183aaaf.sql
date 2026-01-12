-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can insert children" ON public.children;

-- Recreate as PERMISSIVE policies (which is the default)
CREATE POLICY "Anon can insert profiles" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anon can insert children" 
ON public.children 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);