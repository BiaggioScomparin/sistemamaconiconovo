-- Create session_minutes table for meeting minutes (atas)
CREATE TABLE public.session_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodge_id uuid REFERENCES public.lodges(id) ON DELETE CASCADE NOT NULL,
  session_type text NOT NULL DEFAULT 'ordinaria',
  session_date date NOT NULL,
  session_number integer,
  
  -- Content fields for Sessão Ordinária
  opening_time time,
  closing_time time,
  presiding_master text,
  orator text,
  secretary text,
  
  -- Attendance
  members_present text,
  visitors text,
  
  -- Agenda items
  correspondence_read text,
  treasury_report text,
  proposals text,
  deliberations text,
  word_of_order text,
  general_matters text,
  observations text,
  
  -- Status
  status text NOT NULL DEFAULT 'draft', -- draft, completed, signed
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT session_minutes_type_check CHECK (session_type IN ('ordinaria', 'magna')),
  CONSTRAINT session_minutes_status_check CHECK (status IN ('draft', 'completed', 'signed'))
);

-- Create signatures table for digital signatures
CREATE TABLE public.minute_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minute_id uuid REFERENCES public.session_minutes(id) ON DELETE CASCADE NOT NULL,
  signer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  signer_name text NOT NULL,
  signer_position text NOT NULL,
  signature_hash text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  
  UNIQUE(minute_id, signer_id)
);

-- Enable RLS
ALTER TABLE public.session_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minute_signatures ENABLE ROW LEVEL SECURITY;

-- Function to check if user can access minutes (VM, Orador, Secretário, Admin)
CREATE OR REPLACE FUNCTION public.can_access_minutes(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND lodge_position IN ('Venerável Mestre', 'Orador', 'Secretário')
    AND status IN ('approved', 'membro')
  )
$$;

-- RLS Policies for session_minutes
CREATE POLICY "Users with permission can view minutes"
ON public.session_minutes
FOR SELECT
USING (public.can_access_minutes(auth.uid()));

CREATE POLICY "Users with permission can insert minutes"
ON public.session_minutes
FOR INSERT
WITH CHECK (public.can_access_minutes(auth.uid()));

CREATE POLICY "Users with permission can update draft minutes"
ON public.session_minutes
FOR UPDATE
USING (public.can_access_minutes(auth.uid()) AND status = 'draft');

CREATE POLICY "Admins can manage all minutes"
ON public.session_minutes
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for minute_signatures
CREATE POLICY "Users with permission can view signatures"
ON public.minute_signatures
FOR SELECT
USING (public.can_access_minutes(auth.uid()));

CREATE POLICY "Users with permission can sign"
ON public.minute_signatures
FOR INSERT
WITH CHECK (public.can_access_minutes(auth.uid()));

CREATE POLICY "Admins can manage signatures"
ON public.minute_signatures
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_session_minutes_updated_at
BEFORE UPDATE ON public.session_minutes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();