-- =======================================================
-- MIGRATION: WEEKLY PAYMENTS SYSTEM (SISTEMA DE PAGAMENTOS SEMANAIS)
-- =======================================================

-- 1. Create installments table
CREATE TABLE IF NOT EXISTS public.rental_installments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
    installment_number INTEGER, -- 1, 2, 3...
    due_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add recurrence fields to rentals
ALTER TABLE public.rentals 
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'one_time', -- 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_installments_rental ON public.rental_installments(rental_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.rental_installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON public.rental_installments(due_date);

-- 4. Enable RLS (Security)
ALTER TABLE public.rental_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rental installments" ON public.rental_installments
    FOR SELECT USING (
        rental_id IN (
            SELECT id FROM public.rentals WHERE renter_id = auth.uid()::text OR owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Owners and renters can update installments (payment logic)" ON public.rental_installments
    FOR UPDATE USING (
        rental_id IN (
            SELECT id FROM public.rentals WHERE renter_id = auth.uid()::text OR owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Service role can manage all" ON public.rental_installments
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.rental_installments TO authenticated;
GRANT ALL ON public.rental_installments TO service_role;
GRANT ALL ON public.rental_installments TO anon;

SELECT 'Weekly payments schema setup completed successfully.' as status;
