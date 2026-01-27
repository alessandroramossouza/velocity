-- =====================================================
-- VeloCity v4.0 - PAYMENT SYSTEM
-- Complete payment infrastructure
-- PIX, Credit Card, Boleto
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
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
    reference_type VARCHAR(50), -- 'rental', 'service', 'subscription'
    reference_id UUID,
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SAVED CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Card token (tokenized by gateway, never store raw card data!)
    token TEXT NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    
    -- Card display info
    brand VARCHAR(20) NOT NULL,
    last_digits VARCHAR(4) NOT NULL,
    holder_name TEXT NOT NULL,
    expiry_month INT NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
    expiry_year INT NOT NULL CHECK (expiry_year >= 2024),
    
    -- Settings
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    nickname TEXT,
    
    -- Timestamps
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PAYMENT HISTORY VIEW
-- =====================================================
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

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_receiver_id ON payments(receiver_id);
CREATE INDEX IF NOT EXISTS idx_payments_rental_id ON payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_cards_user_id ON saved_cards(user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = receiver_id
    );

DROP POLICY IF EXISTS "Users can create their own payments" ON payments;
CREATE POLICY "Users can create their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
CREATE POLICY "Users can update their own payments" ON payments
    FOR UPDATE USING (auth.uid() = user_id);

-- Saved cards policies
DROP POLICY IF EXISTS "Users can view their own cards" ON saved_cards;
CREATE POLICY "Users can view their own cards" ON saved_cards
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own cards" ON saved_cards;
CREATE POLICY "Users can insert their own cards" ON saved_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cards" ON saved_cards;
CREATE POLICY "Users can update their own cards" ON saved_cards
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cards" ON saved_cards;
CREATE POLICY "Users can delete their own cards" ON saved_cards
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
    p_payment_id UUID,
    p_status VARCHAR(20),
    p_external_id TEXT DEFAULT NULL
)
RETURNS payments AS $$
DECLARE
    updated_payment payments;
BEGIN
    UPDATE payments
    SET 
        status = p_status,
        external_id = COALESCE(p_external_id, external_id),
        paid_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE paid_at END,
        refunded_at = CASE WHEN p_status = 'refunded' THEN NOW() ELSE refunded_at END,
        updated_at = NOW()
    WHERE id = p_payment_id
    RETURNING * INTO updated_payment;
    
    RETURN updated_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set default card
CREATE OR REPLACE FUNCTION set_default_card(p_card_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Remove default from all user's cards
    UPDATE saved_cards SET is_default = FALSE WHERE user_id = p_user_id;
    -- Set new default
    UPDATE saved_cards SET is_default = TRUE WHERE id = p_card_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate PIX code (simulated)
CREATE OR REPLACE FUNCTION generate_pix_payment(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_rental_id UUID DEFAULT NULL,
    p_service_request_id UUID DEFAULT NULL,
    p_receiver_id UUID DEFAULT NULL
)
RETURNS payments AS $$
DECLARE
    new_payment payments;
    pix_code_generated TEXT;
BEGIN
    -- Generate simulated PIX code
    pix_code_generated := '00020126580014BR.GOV.BCB.PIX0136' || 
                          encode(gen_random_bytes(16), 'hex') ||
                          '5204000053039865802BR5913VELOCITY6008SAOPAULO62070503***6304';
    
    INSERT INTO payments (
        user_id, receiver_id, rental_id, service_request_id,
        amount, method, status, description,
        pix_code, pix_qrcode, expires_at
    ) VALUES (
        p_user_id, p_receiver_id, p_rental_id, p_service_request_id,
        p_amount, 'pix', 'pending', p_description,
        pix_code_generated,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        NOW() + INTERVAL '30 minutes'
    )
    RETURNING * INTO new_payment;
    
    RETURN new_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate Boleto (simulated)
CREATE OR REPLACE FUNCTION generate_boleto_payment(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_due_days INT DEFAULT 3,
    p_rental_id UUID DEFAULT NULL,
    p_service_request_id UUID DEFAULT NULL,
    p_receiver_id UUID DEFAULT NULL
)
RETURNS payments AS $$
DECLARE
    new_payment payments;
    boleto_code_generated TEXT;
BEGIN
    -- Generate simulated boleto code
    boleto_code_generated := '23793.38128 60000.000003 00000.000405 ' || 
                             floor(random() * 9 + 1)::text || ' ' ||
                             lpad((p_amount * 100)::bigint::text, 10, '0');
    
    INSERT INTO payments (
        user_id, receiver_id, rental_id, service_request_id,
        amount, method, status, description,
        boleto_code, boleto_due_date, expires_at
    ) VALUES (
        p_user_id, p_receiver_id, p_rental_id, p_service_request_id,
        p_amount, 'boleto', 'pending', p_description,
        boleto_code_generated,
        (NOW() + (p_due_days || ' days')::interval)::date,
        NOW() + (p_due_days || ' days')::interval
    )
    RETURNING * INTO new_payment;
    
    RETURN new_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON payments TO authenticated;
GRANT ALL ON saved_cards TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_card TO authenticated;
GRANT EXECUTE ON FUNCTION generate_pix_payment TO authenticated;
GRANT EXECUTE ON FUNCTION generate_boleto_payment TO authenticated;

-- =====================================================
-- Success message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Payment system tables created successfully!';
    RAISE NOTICE '📊 Tables: payments, saved_cards';
    RAISE NOTICE '🔐 RLS policies enabled';
    RAISE NOTICE '⚡ Functions: generate_pix_payment, generate_boleto_payment, update_payment_status';
END $$;
