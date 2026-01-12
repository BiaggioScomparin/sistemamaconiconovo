-- Add degree field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree text DEFAULT 'Aprendiz';

-- Create a sequence for CIM numbers starting at 720100
CREATE SEQUENCE IF NOT EXISTS cim_sequence START WITH 720100;

-- Create function to generate next CIM number
CREATE OR REPLACE FUNCTION public.generate_cim_number()
RETURNS text AS $$
BEGIN
  RETURN nextval('cim_sequence')::text;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create function to auto-assign CIM when status changes to approved/membro
CREATE OR REPLACE FUNCTION public.assign_cim_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign CIM if status changed to approved or membro and CIM is null
  IF (NEW.status IN ('approved', 'membro') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'membro'))) THEN
    IF NEW.cim_number IS NULL OR NEW.cim_number = '' THEN
      NEW.cim_number := generate_cim_number();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto CIM assignment
DROP TRIGGER IF EXISTS trigger_assign_cim_on_approval ON public.profiles;
CREATE TRIGGER trigger_assign_cim_on_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_cim_on_approval();