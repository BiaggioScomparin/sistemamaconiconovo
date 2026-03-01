
-- Add payment_gateway column to lodges table
ALTER TABLE public.lodges 
ADD COLUMN payment_gateway text NOT NULL DEFAULT 'mercado_pago';

-- Add comment for clarity
COMMENT ON COLUMN public.lodges.payment_gateway IS 'Payment gateway for this lodge: mercado_pago or infinitepay';
