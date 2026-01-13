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