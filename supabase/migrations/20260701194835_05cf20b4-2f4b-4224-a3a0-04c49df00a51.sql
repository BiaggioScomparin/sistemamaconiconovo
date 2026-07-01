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