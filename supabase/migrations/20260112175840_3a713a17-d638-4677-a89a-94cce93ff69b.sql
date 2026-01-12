-- Add RLS policy for members with can_view_daily_attendances permission
CREATE POLICY "Members with permission can view daily attendances"
ON public.attendances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN profiles p ON p.id = up.profile_id
    WHERE p.user_id = auth.uid()
    AND up.can_view_daily_attendances = true
  )
);