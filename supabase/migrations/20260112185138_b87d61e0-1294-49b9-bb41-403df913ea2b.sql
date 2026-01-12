-- Drop and recreate the insert policy properly for anonymous users
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create policy that allows anonymous users to insert profiles
-- Using 'anon' role which is what unauthenticated users use in Supabase
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);