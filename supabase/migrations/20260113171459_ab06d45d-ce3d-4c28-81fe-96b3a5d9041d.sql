-- Create a security definer function to check organization membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create a function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- Drop problematic policies on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Create new non-recursive policy using security definer function
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  owner_id = auth.uid() OR 
  public.is_org_member(auth.uid(), id)
);

-- Also allow anyone to check slug availability (for onboarding)
CREATE POLICY "Anyone can check slug availability"
ON public.organizations FOR SELECT
USING (true);

-- Drop and recreate organization_members policies to use security definer
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view fellow members" ON public.organization_members;

-- Simpler policies that don't cause recursion
CREATE POLICY "Users can view their own membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Org owners can view all members"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

-- Fix organization_subscriptions policy that references organization_members
DROP POLICY IF EXISTS "Org members can view their subscription" ON public.organization_subscriptions;

CREATE POLICY "Org members can view their subscription"
ON public.organization_subscriptions FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);