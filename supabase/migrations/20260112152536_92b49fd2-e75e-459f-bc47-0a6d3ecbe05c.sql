-- Remove the old check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add new check constraint with all valid status values
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'proposta', 'sindicancia', 'reprovado', 'membro'));