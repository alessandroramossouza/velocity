-- Add security_deposit_amount and requires_security_deposit to cars table
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS requires_security_deposit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC DEFAULT 0;

-- Refresh schema cache if needed
notify pgrst, 'reload schema';
