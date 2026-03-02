
CREATE OR REPLACE FUNCTION public.auto_create_member_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When status changes to 'membro', auto-create default permissions
  IF NEW.status = 'membro' AND (OLD.status IS NULL OR OLD.status <> 'membro') THEN
    INSERT INTO user_permissions (profile_id, can_view_card, can_view_attendance, can_register_attendance, can_edit_profile)
    VALUES (NEW.id, true, true, true, true)
    ON CONFLICT (profile_id) DO UPDATE SET
      can_view_card = true,
      can_view_attendance = true,
      can_register_attendance = true,
      can_edit_profile = true,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_member_permissions
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_member_permissions();
