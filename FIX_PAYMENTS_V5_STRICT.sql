-- =====================================================
-- FIX V5.0 PAYMENTS - CLEAN RESTART
-- Fixes type mismatch (TEXT vs UUID) by recreating the table
-- THIS WILL RESET PAYMENT DATA to ensure schema integrity
-- =====================================================

-- 1. Drop dependent views first
DROP VIEW IF EXISTS payment_history;

-- 2. Drop existing tables to clear type conflicts
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS saved_cards CASCADE;

-- 3. Recreate PAYMENTS TABLE with correct types (UUID)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    method VARCHAR(20) NOT NULL CHECK (method IN ('pix', 'credit_card', 'boleto')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'refunded', 'expired', 'cancelled')),
    
    -- External gateway
    external_id TEXT,
    gateway VARCHAR(50),
    
    -- PIX specific
    pix_code TEXT,
    pix_qrcode TEXT,
    pix_key TEXT,
    
    -- Boleto specific
    boleto_code TEXT,
    boleto_url TEXT,
    boleto_barcode TEXT,
    boleto_due_date DATE,
    
    -- Card specific
    card_last_digits VARCHAR(4),
    card_brand VARCHAR(20),
    card_holder TEXT,
    installments INT DEFAULT 1,
    installment_value DECIMAL(12,2),
    
    -- Metadata
    description TEXT,
    reference_type VARCHAR(50), 
    reference_id UUID,
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recreate SAVED CARDS TABLE
CREATE TABLE saved_cards (
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

-- 5. Recreate PAYMENT HISTORY VIEW
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

-- 6. Indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_receiver_id ON payments(receiver_id);
CREATE INDEX idx_payments_rental_id ON payments(rental_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_saved_cards_user_id ON saved_cards(user_id);

-- 7. RLS Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
    FOR UPDATE USING (auth.uid() = user_id);

-- Saved cards policies
CREATE POLICY "Users can view their own cards" ON saved_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards" ON saved_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON saved_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON saved_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ Tables dropped and recreated with CORRECT types (UUID)!';
END $$;
