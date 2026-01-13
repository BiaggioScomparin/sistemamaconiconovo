-- Create organizations table for multi-tenancy
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members table (who belongs to which org)
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_lodges INTEGER NOT NULL DEFAULT 1,
  max_members_per_lodge INTEGER NOT NULL DEFAULT 50,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_subscriptions table
CREATE TABLE public.organization_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link lodges to organizations
ALTER TABLE public.lodges ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members policies
CREATE POLICY "Members can view their org members"
ON public.organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can manage members"
ON public.organization_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can insert themselves as members"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Subscription plans are public
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Organization subscriptions policies
CREATE POLICY "Org members can view their subscription"
ON public.organization_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organization_subscriptions.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage subscription"
ON public.organization_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = organization_subscriptions.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_lodges, max_members_per_lodge, features) VALUES
('Starter', 'Ideal para lojas pequenas', 99.00, 990.00, 1, 30, '["Gestão de membros", "Controle de presença", "Calendário de eventos"]'),
('Professional', 'Para lojas em crescimento', 199.00, 1990.00, 3, 100, '["Tudo do Starter", "Múltiplas lojas", "Relatórios financeiros", "Exportação de dados"]'),
('Enterprise', 'Para grandes orientes', 399.00, 3990.00, 10, 500, '["Tudo do Professional", "Suporte prioritário", "API personalizada", "White-label"]');

-- Create updated_at triggers
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at
BEFORE UPDATE ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();