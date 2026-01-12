-- Create attendance table for session frequency tracking
CREATE TABLE public.attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lodge_id UUID NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('magna', 'ordinaria')),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view their own attendances"
ON public.attendances
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = attendances.profile_id 
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Members can insert their own attendances"
ON public.attendances
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = attendances.profile_id 
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can view all attendances"
ON public.attendances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all attendances"
ON public.attendances
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_attendances_updated_at
BEFORE UPDATE ON public.attendances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint to prevent duplicate attendance on same day/lodge/session
CREATE UNIQUE INDEX idx_unique_attendance 
ON public.attendances(profile_id, lodge_id, session_date, session_type);