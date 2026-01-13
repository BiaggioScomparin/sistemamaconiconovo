-- Remove the unique constraint that prevents multiple payments per month
ALTER TABLE monthly_payments 
DROP CONSTRAINT IF EXISTS monthly_payments_profile_id_reference_month_reference_year_key;