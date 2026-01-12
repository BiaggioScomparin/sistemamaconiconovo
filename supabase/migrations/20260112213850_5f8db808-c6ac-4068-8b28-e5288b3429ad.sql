-- Create INSERT policy for children table to allow anonymous proposals with children
CREATE POLICY "Anyone can insert children for registration" 
ON public.children 
FOR INSERT 
TO public
WITH CHECK (true);