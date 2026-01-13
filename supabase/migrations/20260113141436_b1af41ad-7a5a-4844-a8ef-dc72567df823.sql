-- Allow authenticated users to read specific settings (credit card fee)
CREATE POLICY "Authenticated users can view credit card fee"
ON public.app_settings
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND key IN ('credit_card_fee_percent')
);