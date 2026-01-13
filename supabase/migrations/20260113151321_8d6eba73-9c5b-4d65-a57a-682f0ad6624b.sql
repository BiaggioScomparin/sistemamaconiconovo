-- First drop the policy that depends on the function
DROP POLICY IF EXISTS "Members can view profiles in same lodge" ON public.profiles;

-- Drop and recreate the function with proper security definer settings using plpgsql
DROP FUNCTION IF EXISTS public.get_user_lodge_id(uuid);

CREATE OR REPLACE FUNCTION public.get_user_lodge_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result_lodge_id uuid;
BEGIN
  SELECT lodge_id INTO result_lodge_id 
  FROM public.profiles 
  WHERE user_id = _user_id 
  LIMIT 1;
  RETURN result_lodge_id;
END;
$$;

-- Recreate the policy using the function
CREATE POLICY "Members can view profiles in same lodge"
ON public.profiles
FOR SELECT
USING (
  lodge_id IS NOT NULL 
  AND lodge_id = public.get_user_lodge_id(auth.uid())
);