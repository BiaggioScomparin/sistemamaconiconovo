-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view profiles in same lodge" ON public.profiles;

-- Create a security definer function to get user's lodge_id
CREATE OR REPLACE FUNCTION public.get_user_lodge_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lodge_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Recreate the policy using the function
CREATE POLICY "Members can view profiles in same lodge"
ON public.profiles
FOR SELECT
USING (
  lodge_id IS NOT NULL 
  AND lodge_id = public.get_user_lodge_id(auth.uid())
);