-- Add timeline columns to rentals table
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS signed_contract_url TEXT;

-- Ensure status column works with text (it likely already does)
-- If it's an enum, we might need to alter it, but usually standard supabase setups use text/varchar.
