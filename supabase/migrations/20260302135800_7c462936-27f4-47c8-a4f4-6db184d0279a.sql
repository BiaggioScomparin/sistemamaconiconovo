
-- Trigger function to update pending payments when lodge financial settings change
CREATE OR REPLACE FUNCTION public.sync_lodge_payments_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If default_payment_amount changed, update all pending payments for members of this lodge
  IF OLD.default_payment_amount IS DISTINCT FROM NEW.default_payment_amount THEN
    UPDATE monthly_payments
    SET amount = NEW.default_payment_amount,
        updated_at = now()
    WHERE status = 'pending'
      AND profile_id IN (
        SELECT id FROM profiles WHERE lodge_id = NEW.id AND status IN ('approved', 'membro')
      );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on lodges table
CREATE TRIGGER sync_payments_on_lodge_update
AFTER UPDATE ON public.lodges
FOR EACH ROW
EXECUTE FUNCTION public.sync_lodge_payments_on_update();
