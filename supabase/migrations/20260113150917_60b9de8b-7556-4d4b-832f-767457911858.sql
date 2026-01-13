-- Allow members to view other profiles in the same lodge
CREATE POLICY "Members can view profiles in same lodge"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles my_profile
    WHERE my_profile.user_id = auth.uid()
    AND my_profile.lodge_id = profiles.lodge_id
    AND my_profile.lodge_id IS NOT NULL
  )
);