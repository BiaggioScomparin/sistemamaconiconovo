-- Add magna_ceremony_type and initiates fields to session_minutes table
ALTER TABLE public.session_minutes 
ADD COLUMN IF NOT EXISTS magna_ceremony_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS initiates text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.session_minutes.magna_ceremony_type IS 'Type of ceremony for Magna sessions: iniciacao, elevacao, exaltacao';
COMMENT ON COLUMN public.session_minutes.initiates IS 'Names of initiates/candidates for Magna sessions, comma-separated';