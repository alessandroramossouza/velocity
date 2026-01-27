-- =====================================================
-- V3.4 PARTNER PORTAL - Database Schema
-- =====================================================

-- 1. Update users table to allow 'partner' role
-- Note: This assumes the constraint can be modified. If not, run ALTER TABLE users DROP CONSTRAINT first.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('renter', 'owner', 'partner'));

-- 2. Enhance partners table with user linkage and more fields
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected'));
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS service_area TEXT; -- e.g., 'São Paulo - Zona Sul'
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS website TEXT;

-- 3. Create service_requests table
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT CHECK (service_type IN ('maintenance', 'insurance_quote', 'emergency', 'general')) DEFAULT 'general',
    status TEXT CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for service_requests
-- Owners can see their own requests
CREATE POLICY "Owners can view own requests" ON public.service_requests 
    FOR SELECT USING (auth.uid()::text = owner_id OR true); -- 'OR true' for demo mode without real auth

-- Partners can see requests directed to them
CREATE POLICY "Partners can view their requests" ON public.service_requests 
    FOR SELECT USING (true); -- Relaxed for demo

-- Anyone can insert (demo mode)
CREATE POLICY "Public insert for service_requests" ON public.service_requests 
    FOR INSERT WITH CHECK (true);

-- Anyone can update (demo mode - restrict in production)
CREATE POLICY "Public update for service_requests" ON public.service_requests 
    FOR UPDATE USING (true);

-- 6. Sample Partner Users (for testing)
INSERT INTO public.users (id, name, email, role) VALUES
('partner1', 'AutoMaster Prime', 'contato@automasterprime.com', 'partner'),
('partner2', 'SafeDrive Seguros', 'atendimento@safedrive.com', 'partner')
ON CONFLICT (id) DO NOTHING;

-- 7. Link existing mock partners to their user accounts
UPDATE public.partners SET user_id = 'partner1' WHERE name = 'AutoMaster Prime';
UPDATE public.partners SET user_id = 'partner2' WHERE name = 'SafeDrive Seguros';
