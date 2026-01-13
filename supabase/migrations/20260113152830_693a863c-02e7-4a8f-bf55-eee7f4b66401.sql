-- Fix Issue 2: Restrict anonymous children insert to only pending profiles
DROP POLICY IF EXISTS "Anon can insert children" ON public.children;

CREATE POLICY "Anon can insert children for pending profiles"
ON public.children
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id
    AND p.status = 'pending'
  )
);

-- Fix Issue 3: Create a secure view for lodge members with only public data
CREATE OR REPLACE VIEW public.lodge_members_public
WITH (security_invoker = on)
AS
SELECT 
  id,
  full_name,
  photo_url,
  lodge_position,
  member_status,
  birth_date,
  lodge_id,
  status,
  degree,
  initiation_date
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.lodge_members_public TO authenticated;
GRANT SELECT ON public.lodge_members_public TO anon;