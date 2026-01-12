-- Create table for user feature permissions
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  can_view_card BOOLEAN NOT NULL DEFAULT false,
  can_view_attendance BOOLEAN NOT NULL DEFAULT false,
  can_register_attendance BOOLEAN NOT NULL DEFAULT false,
  can_edit_profile BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = user_permissions.profile_id 
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can view all permissions"
ON public.user_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default permissions for existing members
INSERT INTO public.user_permissions (profile_id)
SELECT id FROM public.profiles 
WHERE user_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.user_permissions WHERE profile_id = profiles.id);