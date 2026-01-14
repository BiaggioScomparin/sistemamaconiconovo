-- Drop the ALL policy that's causing the conflict
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create separate policies for admin operations (excluding INSERT since we have a specific one)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create admin INSERT policy that doesn't conflict
CREATE POLICY "Admins can insert all profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));