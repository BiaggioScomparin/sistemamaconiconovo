-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Anyone authenticated can view lodges" ON public.lodges;

-- Create a new policy that allows anyone (including unauthenticated users) to view lodges
CREATE POLICY "Anyone can view lodges" 
ON public.lodges 
FOR SELECT 
USING (true);