-- Table to store Google Drive OAuth tokens
CREATE TABLE public.google_drive_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  google_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track minute backups
CREATE TABLE public.minute_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minute_id UUID NOT NULL REFERENCES public.session_minutes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  drive_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  backup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minute_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_drive_tokens
CREATE POLICY "Users can view their own tokens" 
ON public.google_drive_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
ON public.google_drive_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON public.google_drive_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
ON public.google_drive_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for minute_backups (admins and specific lodge positions can view)
CREATE POLICY "Admins and authorized users can view backups" 
ON public.minute_backups 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  auth.uid() = user_id
);

CREATE POLICY "Authenticated users can create backups" 
ON public.minute_backups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for google_drive_tokens
CREATE TRIGGER update_google_drive_tokens_updated_at
BEFORE UPDATE ON public.google_drive_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();