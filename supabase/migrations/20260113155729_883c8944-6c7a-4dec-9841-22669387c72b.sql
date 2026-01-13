-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  lodge_id UUID REFERENCES public.lodges(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Admins can manage all events
CREATE POLICY "Admins can manage all events"
ON public.events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view events from their lodge or global events
CREATE POLICY "Members can view events"
ON public.events
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    lodge_id IS NULL OR 
    lodge_id = get_user_lodge_id(auth.uid())
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();