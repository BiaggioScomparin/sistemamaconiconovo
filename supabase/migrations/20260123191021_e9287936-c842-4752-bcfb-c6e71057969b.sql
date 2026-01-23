-- Remove the old check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add new check constraint with all valid status values including new ones
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'proposta', 'sindicancia', 'sindicancia_aprovada', 'aguardando_iniciacao', 'reprovado', 'membro'));

-- Add initiation_scheduled_date column for "Aguardando Iniciação" status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initiation_scheduled_date DATE;