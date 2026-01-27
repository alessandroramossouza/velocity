-- =====================================================
-- FIX V4.0 PAYMENTS
-- Resovles conflict with existing 'payments' table
-- =====================================================

-- 1. Rename payer_id to user_id if it exists (legacy support)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payer_id') THEN
        ALTER TABLE payments RENAME COLUMN payer_id TO user_id;
    END IF;
END $$;

-- 2. Add missing columns to payments table (safe updates)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(20) NOT NULL DEFAULT 'credit_card'; -- defaulting to avoid null constraint issues on old rows
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_qrcode TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS boleto_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS boleto_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS boleto_barcode TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS boleto_due_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last_digits VARCHAR(4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_brand VARCHAR(20);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_holder TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installments INT DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_value DECIMAL(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Drop existing view to be safe
DROP VIEW IF EXISTS payment_history;

-- 4. Recreate Payment History View
CREATE OR REPLACE VIEW payment_history AS
SELECT 
    p.id,
    p.user_id,
    p.receiver_id,
    p.amount,
    p.method,
    p.status,
    p.card_brand,
    p.card_last_digits,
    p.installments,
    p.description,
    p.paid_at,
    p.created_at,
    u.email as payer_email,
    r.email as receiver_email,
    CASE 
        WHEN p.rental_id IS NOT NULL THEN 'rental'
        WHEN p.service_request_id IS NOT NULL THEN 'service'
        ELSE 'other'
    END as payment_type
FROM payments p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN auth.users r ON p.receiver_id = r.id;

-- 5. Ensure Saved Cards table exists
CREATE TABLE IF NOT EXISTS saved_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    brand VARCHAR(20) NOT NULL,
    last_digits VARCHAR(4) NOT NULL,
    holder_name TEXT NOT NULL,
    expiry_month INT NOT NULL,
    expiry_year INT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    nickname TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Re-apply RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create their own payments" ON payments;
CREATE POLICY "Users can create their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
CREATE POLICY "Users can update their own payments" ON payments
    FOR UPDATE USING (auth.uid() = user_id);

-- Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ Payment system FIXED and tables updated successfully!';
END $$;
