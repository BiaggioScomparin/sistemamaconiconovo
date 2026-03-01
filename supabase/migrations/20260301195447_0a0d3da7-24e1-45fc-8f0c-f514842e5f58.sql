
-- Update the function to use the actual project URL and anon key
CREATE OR REPLACE FUNCTION public.notify_on_payment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;
