-- Grant explicit INSERT permission to anon role on profiles table
GRANT INSERT ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO authenticated;