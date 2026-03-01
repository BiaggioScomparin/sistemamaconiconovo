
-- Trigger for monthly_payments UPDATE (e.g. payment_paid, status changes)
CREATE OR REPLACE FUNCTION public.notify_on_payment_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
      body := '{}'::jsonb,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_payment_updated
AFTER UPDATE ON public.monthly_payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payment_updated();

-- Trigger for events UPDATE (e.g. date/time changes)
CREATE OR REPLACE FUNCTION public.notify_on_event_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.event_date IS DISTINCT FROM NEW.event_date 
     OR OLD.event_time IS DISTINCT FROM NEW.event_time
     OR OLD.title IS DISTINCT FROM NEW.title THEN
    PERFORM net.http_post(
      url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
      body := '{}'::jsonb,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_updated
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_event_updated();
