-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id),
    receiver_id TEXT REFERENCES public.users(id),
    rental_id UUID REFERENCES public.rentals(id),
    service_request_id UUID REFERENCES public.service_requests(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    method TEXT NOT NULL CHECK (method IN ('pix', 'credit_card', 'boleto')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'refunded', 'expired', 'cancelled')),
    
    -- Transaction Details
    external_id TEXT, -- Gateway ID
    gateway TEXT, -- 'stripe', 'mercadopago', etc.
    description TEXT,
    
    -- Method Specific Details
    pix_code TEXT,
    pix_qrcode TEXT,
    pix_key TEXT,
    
    boleto_code TEXT,
    boleto_barcode TEXT,
    boleto_due_date DATE,
    boleto_url TEXT,
    
    card_last_digits TEXT,
    card_brand TEXT,
    card_holder TEXT,
    installments INTEGER DEFAULT 1,
    installment_value DECIMAL(10, 2),
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Cards table for "One Click Buy" experience
CREATE TABLE IF NOT EXISTS public.saved_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id),
    token TEXT NOT NULL, -- Gateway token
    gateway TEXT NOT NULL,
    brand TEXT NOT NULL,
    last_digits TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    expiry_month INTEGER NOT NULL,
    expiry_year INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    nickname TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Payments: Users can see their own payments (payer or receiver)
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = receiver_id);

-- Payments: Admins can see all payments
-- (Assuming we have a way to check admin role in RLS, simplified here for now)
-- You might want to add a function is_admin() later. For now, let's keep it open for authenticated or just specific users.
-- Ideally:
-- CREATE POLICY "Admins can view all payments" ON public.payments FOR ALL USING (public.is_admin());

-- For now, allow authenticated users to insert (to make payments)
CREATE POLICY "Users can insert payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Saved Cards: Users manage their own cards
CREATE POLICY "Users manage own cards" ON public.saved_cards
    FOR ALL USING (auth.uid()::text = user_id);

-- Grant permissions
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.saved_cards TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.saved_cards TO service_role;
