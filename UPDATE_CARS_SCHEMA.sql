-- Add security_deposit_amount, requires_security_deposit, and price_per_15_days to cars table
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS requires_security_deposit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_15_days NUMERIC,
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly'; -- 'weekly', 'biweekly', 'monthly'

-- Refresh schema cache if needed
notify pgrst, 'reload schema';
