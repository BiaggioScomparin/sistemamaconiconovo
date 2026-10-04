-- Enum para tipos de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Tabela de roles dos usuários
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Função para verificar role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Tabela de Lojas Maçônicas
CREATE TABLE public.lodges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de perfis dos membros
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    initiation_date DATE,
    mother_name TEXT,
    spouse_name TEXT,
    cim_number TEXT,
    photo_url TEXT,
    lodge_id UUID REFERENCES public.lodges(id),
    -- Endereço
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    -- Status de aprovação
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de filhos
CREATE TABLE public.children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lodges_updated_at
    BEFORE UPDATE ON public.lodges
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lodges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para lodges
CREATE POLICY "Anyone authenticated can view lodges"
    ON public.lodges FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage lodges"
    ON public.lodges FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert a profile for registration"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- RLS Policies para children
CREATE POLICY "Users can view their children"
    ON public.children FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = children.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all children"
    ON public.children FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their children"
    ON public.children FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = children.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all children"
    ON public.children FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket para fotos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Storage policies para photos
CREATE POLICY "Anyone can view photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Users can update their own photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'photos');

CREATE POLICY "Users can delete their own photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'photos');
-- Adicionar coluna CPF na tabela profiles
ALTER TABLE public.profiles ADD COLUMN cpf TEXT;

-- Criar índice único para CPF (opcional, mas recomendado)
CREATE UNIQUE INDEX idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;
-- Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles ADD COLUMN email TEXT;
-- Fix storage bucket ownership controls

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create new policies with proper ownership checks
-- Users can only upload photos to their own folder (user_id/filename)
CREATE POLICY "Users can upload their own profile photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can only update their own photos
CREATE POLICY "Users can update their own photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can only delete their own photos
CREATE POLICY "Users can delete their own photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admins can manage all photos
CREATE POLICY "Admins can manage all photos"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'photos' AND
        public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
        bucket_id = 'photos' AND
        public.has_role(auth.uid(), 'admin'::public.app_role)
    );
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
-- Remove the old check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add new check constraint with all valid status values
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'proposta', 'sindicancia', 'reprovado', 'membro'));
-- Add degree field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree text DEFAULT 'Aprendiz';

-- Create a sequence for CIM numbers starting at 720100
CREATE SEQUENCE IF NOT EXISTS cim_sequence START WITH 720100;

-- Create function to generate next CIM number
CREATE OR REPLACE FUNCTION public.generate_cim_number()
RETURNS text AS $$
BEGIN
  RETURN nextval('cim_sequence')::text;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create function to auto-assign CIM when status changes to approved/membro
CREATE OR REPLACE FUNCTION public.assign_cim_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign CIM if status changed to approved or membro and CIM is null
  IF (NEW.status IN ('approved', 'membro') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'membro'))) THEN
    IF NEW.cim_number IS NULL OR NEW.cim_number = '' THEN
      NEW.cim_number := generate_cim_number();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto CIM assignment
DROP TRIGGER IF EXISTS trigger_assign_cim_on_approval ON public.profiles;
CREATE TRIGGER trigger_assign_cim_on_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_cim_on_approval();
-- Add member_status column to track active/inactive members
ALTER TABLE public.profiles 
ADD COLUMN member_status text NOT NULL DEFAULT 'active' 
CHECK (member_status IN ('active', 'inactive'));
-- Add cargo field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cargo text;
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
-- Create table for user feature permissions
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  can_view_card BOOLEAN NOT NULL DEFAULT false,
  can_view_attendance BOOLEAN NOT NULL DEFAULT false,
  can_register_attendance BOOLEAN NOT NULL DEFAULT false,
  can_edit_profile BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = user_permissions.profile_id 
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Admins can view all permissions"
ON public.user_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default permissions for existing members
INSERT INTO public.user_permissions (profile_id)
SELECT id FROM public.profiles 
WHERE user_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.user_permissions WHERE profile_id = profiles.id);
-- Add permission to view all attendances of the day
ALTER TABLE public.user_permissions 
ADD COLUMN can_view_daily_attendances BOOLEAN NOT NULL DEFAULT false;
-- Add RLS policy for members with can_view_daily_attendances permission
CREATE POLICY "Members with permission can view daily attendances"
ON public.attendances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN profiles p ON p.id = up.profile_id
    WHERE p.user_id = auth.uid()
    AND up.can_view_daily_attendances = true
  )
);
-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Anyone authenticated can view lodges" ON public.lodges;

-- Create a new policy that allows anyone (including unauthenticated users) to view lodges
CREATE POLICY "Anyone can view lodges" 
ON public.lodges 
FOR SELECT 
USING (true);
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a permissive policy that allows anyone to insert profiles for registration
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);
-- Drop the old INSERT policy that requires authentication
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;

-- Create a policy that allows anyone to upload to registrations folder (for pre-registration)
CREATE POLICY "Anyone can upload to registrations folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = 'registrations');

-- Create a policy for authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload their photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = (auth.uid())::text);
-- Drop and recreate the insert policy properly for anonymous users
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create policy that allows anonymous users to insert profiles
-- Using 'anon' role which is what unauthenticated users use in Supabase
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a new PERMISSIVE INSERT policy for public registration
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a new PERMISSIVE INSERT policy for ALL roles (public, anon, authenticated)
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);
-- Create INSERT policy for children table to allow anonymous proposals with children
CREATE POLICY "Anyone can insert children for registration" 
ON public.children 
FOR INSERT 
TO public
WITH CHECK (true);
-- Create storage policy to allow anonymous uploads to the photos bucket
CREATE POLICY "Anyone can upload photos for proposals" 
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'photos');

-- Create storage policy to allow reading photos publicly
CREATE POLICY "Anyone can read photos" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'photos');
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create a PERMISSIVE INSERT policy for public registration
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;

-- Create INSERT policy explicitly for anon and authenticated roles
CREATE POLICY "Anyone can insert a profile for registration" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also ensure children table has the same
DROP POLICY IF EXISTS "Anyone can insert children for registration" ON public.children;

CREATE POLICY "Anyone can insert children for registration" 
ON public.children 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);
-- Drop and recreate all INSERT policies for proposal submission

-- 1. Profiles table - allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can insert a profile for registration" ON public.profiles;
CREATE POLICY "Public can insert profiles" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (true);

-- 2. Children table - allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can insert children for registration" ON public.children;
CREATE POLICY "Public can insert children" 
ON public.children 
FOR INSERT 
TO public
WITH CHECK (true);

-- 3. Storage - ensure anonymous can upload to photos bucket
DROP POLICY IF EXISTS "Anyone can upload photos for proposals" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to registrations folder" ON storage.objects;

CREATE POLICY "Public can upload photos" 
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'photos');

-- 4. Ensure photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
-- First, let's grant necessary permissions to anon role
GRANT INSERT ON public.profiles TO anon;
GRANT INSERT ON public.children TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Also grant to authenticated role
GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.children TO authenticated;

-- Recreate the INSERT policy with explicit anon role
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;
CREATE POLICY "Anon can insert profiles" 
ON public.profiles 
FOR INSERT 
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert children" ON public.children;
CREATE POLICY "Anon can insert children" 
ON public.children 
FOR INSERT 
TO anon
WITH CHECK (true);
-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can insert children" ON public.children;

-- Recreate as PERMISSIVE policies (which is the default)
CREATE POLICY "Anon can insert profiles" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anon can insert children" 
ON public.children 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);
-- Create payments table for monthly fees
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference_month INTEGER NOT NULL CHECK (reference_month >= 1 AND reference_month <= 12),
  reference_year INTEGER NOT NULL CHECK (reference_year >= 2020),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT DEFAULT 'pix',
  pix_transaction_id TEXT,
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, reference_month, reference_year)
);

-- Enable RLS
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

-- Members can view their own payments
CREATE POLICY "Members can view their own payments"
ON public.monthly_payments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = monthly_payments.profile_id
  AND profiles.user_id = auth.uid()
));

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.monthly_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all payments
CREATE POLICY "Admins can manage all payments"
ON public.monthly_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can update their own pending payments (for PIX info)
CREATE POLICY "Members can update their own pending payments"
ON public.monthly_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = monthly_payments.profile_id
    AND profiles.user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Trigger to update updated_at
CREATE TRIGGER update_monthly_payments_updated_at
BEFORE UPDATE ON public.monthly_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_monthly_payments_profile_id ON public.monthly_payments(profile_id);
CREATE INDEX idx_monthly_payments_status ON public.monthly_payments(status);
CREATE INDEX idx_monthly_payments_reference ON public.monthly_payments(reference_year, reference_month);
-- Create settings table for admin configurations
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view settings"
ON public.app_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (key, description) VALUES 
('mercado_pago_access_token', 'Token de acesso do Mercado Pago para integração PIX');
-- Create function to generate monthly payments for all active members
CREATE OR REPLACE FUNCTION public.generate_monthly_payments_for_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month INTEGER;
  current_year INTEGER;
  due_date DATE;
BEGIN
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '9 days'; -- Day 10

  -- Insert payments for all active/approved members who don't have a payment for this month yet
  INSERT INTO monthly_payments (profile_id, reference_month, reference_year, amount, due_date, status)
  SELECT 
    p.id,
    current_month,
    current_year,
    200,
    due_date,
    'pending'
  FROM profiles p
  WHERE p.status IN ('approved', 'membro')
    AND p.member_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM monthly_payments mp 
      WHERE mp.profile_id = p.id 
        AND mp.reference_month = current_month 
        AND mp.reference_year = current_year
    );
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the job to run at 00:01 on the 1st of every month
SELECT cron.schedule(
  'generate-monthly-payments',
  '1 0 1 * *',
  $$SELECT public.generate_monthly_payments_for_all()$$
);
-- Remove the unique constraint that prevents multiple payments per month
ALTER TABLE monthly_payments 
DROP CONSTRAINT IF EXISTS monthly_payments_profile_id_reference_month_reference_year_key;
-- Add default monthly payment amount to lodges
ALTER TABLE lodges ADD COLUMN IF NOT EXISTS default_payment_amount numeric DEFAULT 200;
-- Allow authenticated users to read specific settings (credit card fee)
CREATE POLICY "Authenticated users can view credit card fee"
ON public.app_settings
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND key IN ('credit_card_fee_percent')
);
-- Add lodge_position column to profiles table for Masonic lodge positions
ALTER TABLE public.profiles 
ADD COLUMN lodge_position text NULL;

-- Add a comment to document the valid values
COMMENT ON COLUMN public.profiles.lodge_position IS 'Cargo ocupado na Loja: Venerável Mestre, Primeiro Vigilante, Segundo Vigilante, Orador, Secretário, Tesoureiro, Mestre de Cerimônias, 1º Diácono, 2º Diácono, 1º Experto, 2º Experto, Cobridor Interno, Cobridor Externo, Porta Bandeira, Porta Estandarte, Porta Espada, Mestre de Banquetes, Mestre de Harmonia';
-- Allow members to view other profiles in the same lodge
CREATE POLICY "Members can view profiles in same lodge"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles my_profile
    WHERE my_profile.user_id = auth.uid()
    AND my_profile.lodge_id = profiles.lodge_id
    AND my_profile.lodge_id IS NOT NULL
  )
);
-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view profiles in same lodge" ON public.profiles;

-- Create a security definer function to get user's lodge_id
CREATE OR REPLACE FUNCTION public.get_user_lodge_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lodge_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Recreate the policy using the function
CREATE POLICY "Members can view profiles in same lodge"
ON public.profiles
FOR SELECT
USING (
  lodge_id IS NOT NULL 
  AND lodge_id = public.get_user_lodge_id(auth.uid())
);
-- First drop the policy that depends on the function
DROP POLICY IF EXISTS "Members can view profiles in same lodge" ON public.profiles;

-- Drop and recreate the function with proper security definer settings using plpgsql
DROP FUNCTION IF EXISTS public.get_user_lodge_id(uuid);

CREATE OR REPLACE FUNCTION public.get_user_lodge_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result_lodge_id uuid;
BEGIN
  SELECT lodge_id INTO result_lodge_id 
  FROM public.profiles 
  WHERE user_id = _user_id 
  LIMIT 1;
  RETURN result_lodge_id;
END;
$$;

-- Recreate the policy using the function
CREATE POLICY "Members can view profiles in same lodge"
ON public.profiles
FOR SELECT
USING (
  lodge_id IS NOT NULL 
  AND lodge_id = public.get_user_lodge_id(auth.uid())
);
-- Fix Issue 2: Restrict anonymous children insert to only pending profiles
DROP POLICY IF EXISTS "Anon can insert children" ON public.children;

CREATE POLICY "Anon can insert children for pending profiles"
ON public.children
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id
    AND p.status = 'pending'
  )
);

-- Fix Issue 3: Create a secure view for lodge members with only public data
CREATE OR REPLACE VIEW public.lodge_members_public
WITH (security_invoker = on)
AS
SELECT 
  id,
  full_name,
  photo_url,
  lodge_position,
  member_status,
  birth_date,
  lodge_id,
  status,
  degree,
  initiation_date
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.lodge_members_public TO authenticated;
GRANT SELECT ON public.lodge_members_public TO anon;
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
-- Create trigger to automatically assign CIM number when status becomes 'membro' or 'approved'
CREATE TRIGGER assign_cim_on_status_change
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_cim_on_approval();
-- Create organizations table for multi-tenancy
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members table (who belongs to which org)
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_lodges INTEGER NOT NULL DEFAULT 1,
  max_members_per_lodge INTEGER NOT NULL DEFAULT 50,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_subscriptions table
CREATE TABLE public.organization_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link lodges to organizations
ALTER TABLE public.lodges ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members policies
CREATE POLICY "Members can view their org members"
ON public.organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can manage members"
ON public.organization_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can insert themselves as members"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Subscription plans are public
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Organization subscriptions policies
CREATE POLICY "Org members can view their subscription"
ON public.organization_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organization_subscriptions.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage subscription"
ON public.organization_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = organization_subscriptions.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_lodges, max_members_per_lodge, features) VALUES
('Starter', 'Ideal para lojas pequenas', 99.00, 990.00, 1, 30, '["Gestão de membros", "Controle de presença", "Calendário de eventos"]'),
('Professional', 'Para lojas em crescimento', 199.00, 1990.00, 3, 100, '["Tudo do Starter", "Múltiplas lojas", "Relatórios financeiros", "Exportação de dados"]'),
('Enterprise', 'Para grandes orientes', 399.00, 3990.00, 10, 500, '["Tudo do Professional", "Suporte prioritário", "API personalizada", "White-label"]');

-- Create updated_at triggers
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at
BEFORE UPDATE ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Fix the overly permissive RLS policy for organization_members
DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;

-- Create more specific policies for organization_members
CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);
-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can delete members" ON public.organization_members;

-- Create non-recursive policies for organization_members
-- Users can view members of organizations they belong to
CREATE POLICY "Users can view org members"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- Users can view other members in same org (non-recursive approach using organizations table)
CREATE POLICY "Users can view fellow members"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

-- Org owners can manage all members
CREATE POLICY "Org owners can update members"
ON public.organization_members FOR UPDATE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Org owners can delete members"
ON public.organization_members FOR DELETE
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);
-- Create a security definer function to check organization membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create a function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- Drop problematic policies on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Create new non-recursive policy using security definer function
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  owner_id = auth.uid() OR 
  public.is_org_member(auth.uid(), id)
);

-- Also allow anyone to check slug availability (for onboarding)
CREATE POLICY "Anyone can check slug availability"
ON public.organizations FOR SELECT
USING (true);

-- Drop and recreate organization_members policies to use security definer
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view fellow members" ON public.organization_members;

-- Simpler policies that don't cause recursion
CREATE POLICY "Users can view their own membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Org owners can view all members"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
  )
);

-- Fix organization_subscriptions policy that references organization_members
DROP POLICY IF EXISTS "Org members can view their subscription" ON public.organization_subscriptions;

CREATE POLICY "Org members can view their subscription"
ON public.organization_subscriptions FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);
-- Create library_items table
CREATE TABLE public.library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  degree TEXT NOT NULL CHECK (degree IN ('Aprendiz', 'Companheiro', 'Mestre')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Admin can manage all library items
CREATE POLICY "Admins can manage library items"
ON public.library_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view items matching their degree
CREATE POLICY "Members can view items for their degree"
ON public.library_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.status = 'approved'
    AND (
      (p.degree = 'Aprendiz' AND library_items.degree = 'Aprendiz')
      OR (p.degree = 'Companheiro' AND library_items.degree IN ('Aprendiz', 'Companheiro'))
      OR (p.degree = 'Mestre' AND library_items.degree IN ('Aprendiz', 'Companheiro', 'Mestre'))
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_library_items_updated_at
BEFORE UPDATE ON public.library_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create storage bucket for library files
INSERT INTO storage.buckets (id, name, public)
VALUES ('library', 'library', true);

-- Allow admins to upload files
CREATE POLICY "Admins can upload library files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'library' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update files
CREATE POLICY "Admins can update library files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'library' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete library files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'library' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to view library files
CREATE POLICY "Authenticated users can view library files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'library' AND
  auth.role() = 'authenticated'
);
-- Drop the existing policy
DROP POLICY IF EXISTS "Members can view items for their degree" ON public.library_items;

-- Create corrected policy including 'membro' status
CREATE POLICY "Members can view items for their degree"
ON public.library_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.status IN ('approved', 'membro')
    AND (
      (p.degree = 'Aprendiz' AND library_items.degree = 'Aprendiz')
      OR (p.degree = 'Companheiro' AND library_items.degree IN ('Aprendiz', 'Companheiro'))
      OR (p.degree = 'Mestre' AND library_items.degree IN ('Aprendiz', 'Companheiro', 'Mestre'))
    )
  )
);
-- Add category column to library_items
ALTER TABLE public.library_items 
ADD COLUMN category text NOT NULL DEFAULT 'Documentos';

-- Add check constraint for valid categories
ALTER TABLE public.library_items 
ADD CONSTRAINT library_items_category_check 
CHECK (category IN ('Documentos', 'Livros', 'Cursos', 'Trabalhos'));
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
-- Add missing columns for complete GOIB session minutes
ALTER TABLE public.session_minutes 
ADD COLUMN IF NOT EXISTS first_vigilant text,
ADD COLUMN IF NOT EXISTS second_vigilant text,
ADD COLUMN IF NOT EXISTS first_deacon text,
ADD COLUMN IF NOT EXISTS second_deacon text,
ADD COLUMN IF NOT EXISTS chancellor text,
ADD COLUMN IF NOT EXISTS inner_guard text,
ADD COLUMN IF NOT EXISTS master_of_ceremonies text,
ADD COLUMN IF NOT EXISTS hospitaller text,
ADD COLUMN IF NOT EXISTS treasurer text,
ADD COLUMN IF NOT EXISTS master_of_harmony text,
ADD COLUMN IF NOT EXISTS previous_minutes_reading text,
ADD COLUMN IF NOT EXISTS expedient text,
ADD COLUMN IF NOT EXISTS proposal_bag text,
ADD COLUMN IF NOT EXISTS order_of_the_day text,
ADD COLUMN IF NOT EXISTS study_time text,
ADD COLUMN IF NOT EXISTS beneficence_trunk text,
ADD COLUMN IF NOT EXISTS word_for_order text,
ADD COLUMN IF NOT EXISTS closing_ritual text,
ADD COLUMN IF NOT EXISTS masonic_year text;
-- Update the can_access_minutes function to accept the actual values stored in the database
CREATE OR REPLACE FUNCTION public.can_access_minutes(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND lodge_position IN ('Venerável Mestre', 'Orador', 'Secretário', 'veneravel_mestre', 'orador', 'secretario')
    AND status IN ('approved', 'membro')
  )
$$;
-- Drop the existing policy that may be causing issues
DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;

-- Create a more permissive policy for proposals
-- Allow anyone (authenticated or not) to insert profiles with status 'proposta' or 'pending'
CREATE POLICY "Anyone can insert proposal profiles"
ON public.profiles
FOR INSERT
WITH CHECK (status IN ('proposta', 'pending'));
-- Drop the current policy
DROP POLICY IF EXISTS "Anyone can insert proposal profiles" ON public.profiles;

-- Create a new policy that explicitly allows anon and authenticated roles
CREATE POLICY "Anyone can insert proposal profiles"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (status IN ('proposta', 'pending'));
-- Grant explicit INSERT permission to anon role on profiles table
GRANT INSERT ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO authenticated;
-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (important!)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Grant all necessary permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Also grant usage on the schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
-- Grant storage permissions to anon
GRANT SELECT, INSERT ON storage.objects TO anon;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
-- Drop existing conflicting policy and create one for anon
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload photos" ON storage.objects;

-- Create policy allowing anon to upload to photos bucket
CREATE POLICY "Anon can upload photos"
ON storage.objects
FOR INSERT
TO anon, authenticated, public
WITH CHECK (bucket_id = 'photos');
-- Drop the ALL policy that's causing the conflict
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create separate policies for admin operations (excluding INSERT since we have a specific one)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create admin INSERT policy that doesn't conflict
CREATE POLICY "Admins can insert all profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Drop existing insert policies
DROP POLICY IF EXISTS "Anyone can insert proposal profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON public.profiles;

-- Create a single, simple policy for public proposal submissions
-- Using TRUE for roles means it applies to all connections
CREATE POLICY "Public can submit proposals"
ON public.profiles
FOR INSERT
WITH CHECK (status IN ('proposta', 'pending'));

-- Ensure anon role can use the table
GRANT ALL ON public.profiles TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
-- Drop and recreate the policy with explicit role
DROP POLICY IF EXISTS "Public can submit proposals" ON public.profiles;

-- Create policy explicitly for anon and authenticated roles
CREATE POLICY "Anyone can submit proposals"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (status IN ('proposta', 'pending'));
-- Revoke and re-grant to ensure clean state
REVOKE ALL ON public.profiles FROM anon;

-- Grant INSERT permission explicitly to anon
GRANT INSERT ON public.profiles TO anon;

-- Grant SELECT too (needed for .select() after insert)
GRANT SELECT ON public.profiles TO anon;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;

-- Verify by checking hasTablePrivilege
DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.profiles', 'INSERT') THEN
    RAISE EXCEPTION 'anon role still does not have INSERT privilege on profiles';
  END IF;
END $$;
-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can submit proposals" ON public.profiles;

-- Create new policy that only allows 'proposta' status
CREATE POLICY "Anyone can submit proposals"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'proposta');
-- Grant permissions to anon role for profiles table
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;

-- Also grant usage on sequences that profiles might need
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
-- Drop the existing policy that allows anon inserts
DROP POLICY IF EXISTS "Anyone can submit proposals" ON public.profiles;

-- Create new policy that allows authenticated users to submit proposals
CREATE POLICY "Authenticated users can submit proposals"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (status = 'proposta');

-- Also allow authenticated users to read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR status = 'proposta');
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
-- Add magna_ceremony_type and initiates fields to session_minutes table
ALTER TABLE public.session_minutes 
ADD COLUMN IF NOT EXISTS magna_ceremony_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS initiates text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.session_minutes.magna_ceremony_type IS 'Type of ceremony for Magna sessions: iniciacao, elevacao, exaltacao';
COMMENT ON COLUMN public.session_minutes.initiates IS 'Names of initiates/candidates for Magna sessions, comma-separated';
-- Add logo_url column to lodges table
ALTER TABLE public.lodges 
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.lodges.logo_url IS 'URL of the lodge logo stored in storage bucket';
-- Remove the old check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add new check constraint with all valid status values including new ones
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'proposta', 'proposta_completa', 'sindicancia', 'sindicancia_aprovada', 'aguardando_iniciacao', 'reprovado', 'membro'));

-- Add initiation_scheduled_date column for "Aguardando Iniciação" status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initiation_scheduled_date DATE;
-- Add payment gateway setting and InfinitePay token
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('payment_gateway', 'mercado_pago', 'Gateway de pagamento ativo (mercado_pago ou infinitepay)'),
  ('infinitepay_client_id', NULL, 'Client ID do InfinitePay'),
  ('infinitepay_client_secret', NULL, 'Client Secret do InfinitePay')
ON CONFLICT (key) DO NOTHING;

-- Add payment_gateway column to lodges table
ALTER TABLE public.lodges 
ADD COLUMN payment_gateway text NOT NULL DEFAULT 'mercado_pago';

-- Add comment for clarity
COMMENT ON COLUMN public.lodges.payment_gateway IS 'Payment gateway for this lodge: mercado_pago or infinitepay';


-- WhatsApp connection settings per lodge
CREATE TABLE public.whatsapp_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lodge_id uuid NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  instance_id text NOT NULL,
  token text NOT NULL,
  base_url text NOT NULL DEFAULT 'https://api.z-api.io',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lodge_id)
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view whatsapp instances"
  ON public.whatsapp_instances FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification rules configuration
CREATE TABLE public.notification_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lodge_id uuid NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'payment_created', 'payment_before_due', 'payment_due_day', 'payment_overdue', 'payment_paid', 'event_created', 'event_before_day', 'event_same_day'
  is_enabled boolean NOT NULL DEFAULT true,
  days_offset integer DEFAULT 0, -- negative = before, positive = after, 0 = same day
  hours_before integer DEFAULT NULL, -- for event same-day notifications (hours before event)
  repeat_interval_days integer DEFAULT NULL, -- for overdue: repeat every N days
  message_template text, -- custom message template with placeholders
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification rules"
  ON public.notification_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view notification rules"
  ON public.notification_rules FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Log of sent notifications (to avoid duplicates and track history)
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lodge_id uuid NOT NULL REFERENCES public.lodges(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.notification_rules(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category text NOT NULL,
  reference_id text, -- payment_id or event_id
  phone text,
  message text,
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view notification logs"
  ON public.notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- Add api_format column to whatsapp_instances to support different providers
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS api_format text NOT NULL DEFAULT 'z-pro';


-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to trigger notifications via edge function on payment insert
CREATE OR REPLACE FUNCTION public.notify_on_payment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  anon_key text;
BEGIN
  -- Call process-notifications edge function via pg_net
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-notifications',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the insert if notification fails
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on monthly_payments for INSERT
CREATE TRIGGER trigger_notify_on_payment_created
AFTER INSERT ON public.monthly_payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payment_created();

-- Also trigger on events table for event notifications
CREATE OR REPLACE FUNCTION public.notify_on_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-notifications',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_created
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_event_created();


-- Update the function to use the actual project URL and anon key
CREATE OR REPLACE FUNCTION public.notify_on_payment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;


-- Trigger for monthly_payments UPDATE (e.g. payment_paid, status changes)
CREATE OR REPLACE FUNCTION public.notify_on_payment_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
      body := '{}'::jsonb,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_payment_updated
AFTER UPDATE ON public.monthly_payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payment_updated();

-- Trigger for events UPDATE (e.g. date/time changes)
CREATE OR REPLACE FUNCTION public.notify_on_event_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.event_date IS DISTINCT FROM NEW.event_date 
     OR OLD.event_time IS DISTINCT FROM NEW.event_time
     OR OLD.title IS DISTINCT FROM NEW.title THEN
    PERFORM net.http_post(
      url := 'https://fqvvfslqeajyrgyvjwpp.supabase.co/functions/v1/process-notifications',
      body := '{}'::jsonb,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdnZmc2xxZWFqeXJneXZqd3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjQ5MzAsImV4cCI6MjA4Mzc0MDkzMH0.EbYQB-awhJZaWF7IU0ekgiF_X39ApmEtm4tpo2WGFW0"}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_updated
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_event_updated();


-- Trigger function to update pending payments when lodge financial settings change
CREATE OR REPLACE FUNCTION public.sync_lodge_payments_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If default_payment_amount changed, update all pending payments for members of this lodge
  IF OLD.default_payment_amount IS DISTINCT FROM NEW.default_payment_amount THEN
    UPDATE monthly_payments
    SET amount = NEW.default_payment_amount,
        updated_at = now()
    WHERE status = 'pending'
      AND profile_id IN (
        SELECT id FROM profiles WHERE lodge_id = NEW.id AND status IN ('approved', 'membro')
      );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on lodges table
CREATE TRIGGER sync_payments_on_lodge_update
AFTER UPDATE ON public.lodges
FOR EACH ROW
EXECUTE FUNCTION public.sync_lodge_payments_on_update();


CREATE OR REPLACE FUNCTION public.auto_create_member_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When status changes to 'membro', auto-create default permissions
  IF NEW.status = 'membro' AND (OLD.status IS NULL OR OLD.status <> 'membro') THEN
    INSERT INTO user_permissions (profile_id, can_view_card, can_view_attendance, can_register_attendance, can_edit_profile)
    VALUES (NEW.id, true, true, true, true)
    ON CONFLICT (profile_id) DO UPDATE SET
      can_view_card = true,
      can_view_attendance = true,
      can_register_attendance = true,
      can_edit_profile = true,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_member_permissions
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_member_permissions();

UPDATE public.subscription_plans SET price_monthly = 199.33 WHERE name = 'Professional';
ALTER TABLE public.profiles ADD COLUMN spouse_birth_date date;
ALTER TABLE public.notification_rules ADD COLUMN whatsapp_group_id text DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.generate_monthly_payments_for_all()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month INTEGER;
  current_year INTEGER;
  due_date DATE;
BEGIN
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '9 days'; -- Day 10

  INSERT INTO monthly_payments (profile_id, reference_month, reference_year, amount, due_date, status)
  SELECT 
    p.id,
    current_month,
    current_year,
    COALESCE(l.default_payment_amount, 200),
    due_date,
    'pending'
  FROM profiles p
  LEFT JOIN lodges l ON l.id = p.lodge_id
  WHERE p.status IN ('approved', 'membro')
    AND p.member_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM monthly_payments mp 
      WHERE mp.profile_id = p.id 
        AND mp.reference_month = current_month 
        AND mp.reference_year = current_year
    );
END;
$function$;

ALTER TABLE public.lodges ADD COLUMN IF NOT EXISTS billing_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.generate_monthly_payments_for_all()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month INTEGER;
  current_year INTEGER;
  due_date DATE;
BEGIN
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '9 days';

  INSERT INTO monthly_payments (profile_id, reference_month, reference_year, amount, due_date, status)
  SELECT 
    p.id,
    current_month,
    current_year,
    COALESCE(l.default_payment_amount, 200),
    due_date,
    'pending'
  FROM profiles p
  LEFT JOIN lodges l ON l.id = p.lodge_id
  WHERE p.status IN ('approved', 'membro')
    AND p.member_status = 'active'
    AND COALESCE(l.billing_enabled, true) = true
    AND NOT EXISTS (
      SELECT 1 FROM monthly_payments mp 
      WHERE mp.profile_id = p.id 
        AND mp.reference_month = current_month 
        AND mp.reference_year = current_year
    );
END;
$function$;
