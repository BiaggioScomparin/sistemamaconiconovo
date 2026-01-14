-- Grant permissions to anon role for profiles table
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;

-- Also grant usage on sequences that profiles might need
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;