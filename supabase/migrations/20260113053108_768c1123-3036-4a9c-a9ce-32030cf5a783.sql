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