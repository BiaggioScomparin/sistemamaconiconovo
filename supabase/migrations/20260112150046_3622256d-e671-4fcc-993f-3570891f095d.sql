-- Update profile status to support new workflow
-- First, let's update the status column to support the new values: proposta, sindicancia, reprovado, membro

-- Add new columns for the proposal form
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS naturality TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Brasileiro',
ADD COLUMN IF NOT EXISTS residence_time TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS cell_phone TEXT,
ADD COLUMN IF NOT EXISTS identity_number TEXT,
ADD COLUMN IF NOT EXISTS identity_issuer TEXT,
ADD COLUMN IF NOT EXISTS voter_title TEXT,
ADD COLUMN IF NOT EXISTS voter_zone TEXT,
ADD COLUMN IF NOT EXISTS voter_city TEXT,
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS civil_status TEXT,
ADD COLUMN IF NOT EXISTS marriage_date DATE,
ADD COLUMN IF NOT EXISTS spouse_profession TEXT,
ADD COLUMN IF NOT EXISTS spouse_retired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profession TEXT,
ADD COLUMN IF NOT EXISTS is_retired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS employer TEXT,
ADD COLUMN IF NOT EXISTS employer_phone TEXT,
ADD COLUMN IF NOT EXISTS work_street TEXT,
ADD COLUMN IF NOT EXISTS work_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS work_city TEXT,
ADD COLUMN IF NOT EXISTS work_state TEXT,
ADD COLUMN IF NOT EXISTS work_cep TEXT,
ADD COLUMN IF NOT EXISTS work_time TEXT,
ADD COLUMN IF NOT EXISTS monthly_income TEXT,
ADD COLUMN IF NOT EXISTS opinion_masonry TEXT,
ADD COLUMN IF NOT EXISTS expectation_masonry TEXT,
ADD COLUMN IF NOT EXISTS informed_financial_values BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_afford_financial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agrees_investigation_fee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS aware_no_refund BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS opinion_family TEXT,
ADD COLUMN IF NOT EXISTS believes_supreme_being BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS opinion_freedom TEXT,
ADD COLUMN IF NOT EXISTS opinion_equality TEXT,
ADD COLUMN IF NOT EXISTS opinion_fraternity TEXT,
ADD COLUMN IF NOT EXISTS proposal_date DATE,
ADD COLUMN IF NOT EXISTS sponsor_name TEXT;

-- Update status to allow new values (proposta, sindicancia, reprovado, membro)
-- Note: 'pending' will be mapped to 'proposta' in code, 'approved' to 'membro'