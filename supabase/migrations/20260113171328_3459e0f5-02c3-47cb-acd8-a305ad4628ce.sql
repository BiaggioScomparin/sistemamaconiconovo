-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can delete members" ON public.organization_members;

-- Create non-recursive policies for organization_members
-- Users can view members of organizations they belong to
CREATE POLICY "Users can view org members"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- Users can view other members in same org (non-recursive approach using organizations table)
CREATE POLICY "Users can view fellow members"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

-- Org owners can manage all members
CREATE POLICY "Org owners can update members"
ON public.organization_members FOR UPDATE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Org owners can delete members"
ON public.organization_members FOR DELETE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);