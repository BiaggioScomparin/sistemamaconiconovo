-- Add lodge_position column to profiles table for Masonic lodge positions
ALTER TABLE public.profiles 
ADD COLUMN lodge_position text NULL;

-- Add a comment to document the valid values
COMMENT ON COLUMN public.profiles.lodge_position IS 'Cargo ocupado na Loja: Venerável Mestre, Primeiro Vigilante, Segundo Vigilante, Orador, Secretário, Tesoureiro, Mestre de Cerimônias, 1º Diácono, 2º Diácono, 1º Experto, 2º Experto, Cobridor Interno, Cobridor Externo, Porta Bandeira, Porta Estandarte, Porta Espada, Mestre de Banquetes, Mestre de Harmonia';