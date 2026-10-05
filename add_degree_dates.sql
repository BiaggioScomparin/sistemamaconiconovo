ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS elevation_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exaltation_date DATE;

-- Update get_public_member_profile RPC if exists to return initiation_date, elevation_date, exaltation_date
CREATE OR REPLACE FUNCTION public.get_public_member_profile(p_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'full_name', p.full_name,
    'cim_number', p.cim_number,
    'member_status', COALESCE(p.member_status, 'active'),
    'degree', p.degree,
    'lodge_name', l.name,
    'lodge_number', l.number,
    'lodge_city', l.city,
    'lodge_state', l.state,
    'initiation_date', p.initiation_date,
    'elevation_date', p.elevation_date,
    'exaltation_date', p.exaltation_date
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.lodges l ON p.lodge_id = l.id
  WHERE p.id::text = p_id OR p.cim_number = p_id
  LIMIT 1;

  RETURN v_result;
END;
$$;
