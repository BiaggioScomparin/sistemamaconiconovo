
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to trigger notifications via edge function on payment insert
CREATE OR REPLACE FUNCTION public.notify_on_payment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  anon_key text;
BEGIN
  -- Call process-notifications edge function via pg_net
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-notifications',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the insert if notification fails
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on monthly_payments for INSERT
CREATE TRIGGER trigger_notify_on_payment_created
AFTER INSERT ON public.monthly_payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payment_created();

-- Also trigger on events table for event notifications
CREATE OR REPLACE FUNCTION public.notify_on_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-notifications',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_created
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_event_created();
