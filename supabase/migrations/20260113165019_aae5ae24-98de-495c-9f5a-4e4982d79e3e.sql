-- Create trigger to automatically assign CIM number when status becomes 'membro' or 'approved'
CREATE TRIGGER assign_cim_on_status_change
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_cim_on_approval();