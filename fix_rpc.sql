CREATE OR REPLACE FUNCTION public.get_public_member_profile(p_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_clean_id text;
BEGIN
  v_clean_id := TRIM(p_id);

  SELECT json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'cim_number', p.cim_number,
    'member_status', COALESCE(p.member_status, 'active'),
    'status', p.status,
    'degree', COALESCE(p.degree, 'Mestre Maçom'),
    'lodge_name', COALESCE(l.name, 'Lealdade e Justiça'),
    'lodge_number', '001',
    'lodge_city', COALESCE(l.city, 'Oriente'),
    'lodge_state', COALESCE(l.state, 'SP'),
    'initiation_date', p.initiation_date,
    'elevation_date', p.elevation_date,
    'exaltation_date', p.exaltation_date,
    'created_at', p.created_at
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.lodges l ON p.lodge_id = l.id
  WHERE p.id::text = v_clean_id 
     OR p.cim_number = v_clean_id 
     OR REPLACE(p.id::text, '-', '') = REPLACE(v_clean_id, '-', '')
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_member_profile(text) TO anon, authenticated, service_role;

-- TEST CALL FOR f2db7109-ca19-45c9-bb50-69e7756ff615
SELECT public.get_public_member_profile('f2db7109-ca19-45c9-bb50-69e7756ff615');
