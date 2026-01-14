-- Revoke and re-grant to ensure clean state
REVOKE ALL ON public.profiles FROM anon;

-- Grant INSERT permission explicitly to anon
GRANT INSERT ON public.profiles TO anon;

-- Grant SELECT too (needed for .select() after insert)
GRANT SELECT ON public.profiles TO anon;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;

-- Verify by checking hasTablePrivilege
DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.profiles', 'INSERT') THEN
    RAISE EXCEPTION 'anon role still does not have INSERT privilege on profiles';
  END IF;
END $$;