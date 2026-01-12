-- Add permission to view all attendances of the day
ALTER TABLE public.user_permissions 
ADD COLUMN can_view_daily_attendances BOOLEAN NOT NULL DEFAULT false;