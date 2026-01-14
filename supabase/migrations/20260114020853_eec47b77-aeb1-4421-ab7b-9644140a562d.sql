-- Update the can_access_minutes function to accept the actual values stored in the database
CREATE OR REPLACE FUNCTION public.can_access_minutes(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND lodge_position IN ('Venerável Mestre', 'Orador', 'Secretário', 'veneravel_mestre', 'orador', 'secretario')
    AND status IN ('approved', 'membro')
  )
$$;