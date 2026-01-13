-- Add default monthly payment amount to lodges
ALTER TABLE lodges ADD COLUMN IF NOT EXISTS default_payment_amount numeric DEFAULT 200;