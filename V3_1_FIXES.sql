-- Fixes and new tables for the latest code updates

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Installments Table (for weekly/biweekly payments)
-- Matches code usage of 'rental_installments'
CREATE TABLE IF NOT EXISTS public.rental_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES public.rentals(id),
    installment_number INTEGER NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled
    paid_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Rentals Table with needed columns
ALTER TABLE public.rentals 
ADD COLUMN IF NOT EXISTS contract_url TEXT,
ADD COLUMN IF NOT EXISTS signed_contract_url TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status TEXT, -- pending, approved, rejected
ADD COLUMN IF NOT EXISTS rental_type TEXT DEFAULT 'daily'; -- daily, uber

-- 4. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_installments ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Simplified for MVP - Open access or based on ID)
DROP POLICY IF EXISTS "Public Notifications" ON public.notifications;
CREATE POLICY "Public Notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Installments" ON public.rental_installments;
CREATE POLICY "Public Installments" ON public.rental_installments FOR ALL USING (true) WITH CHECK (true);

-- 6. Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_installments;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
