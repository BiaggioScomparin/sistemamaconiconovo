-- Fix the overly permissive RLS policy for organization_members
DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;

-- Create more specific policies for organization_members
CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);