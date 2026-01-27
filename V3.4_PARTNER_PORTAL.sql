-- =====================================================
-- V3.4 PARTNER PORTAL - FIX (Adiciona colunas que faltam)
-- Execute este arquivo no Supabase SQL Editor
-- =====================================================

-- 1. Garantir extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update users table to allow 'partner' role
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_role_check;
    END IF;
END $$;

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('renter', 'owner', 'partner'));

-- 3. Adicionar colunas que faltam na tabela partners (se a tabela já existir)
DO $$
BEGIN
    -- Adicionar user_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'user_id') THEN
        ALTER TABLE public.partners ADD COLUMN user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Adicionar status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'status') THEN
        ALTER TABLE public.partners ADD COLUMN status TEXT DEFAULT 'active';
    END IF;

    -- Adicionar address se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'address') THEN
        ALTER TABLE public.partners ADD COLUMN address TEXT;
    END IF;

    -- Adicionar service_area se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'service_area') THEN
        ALTER TABLE public.partners ADD COLUMN service_area TEXT;
    END IF;

    -- Adicionar website se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'website') THEN
        ALTER TABLE public.partners ADD COLUMN website TEXT;
    END IF;
END $$;

-- 4. Criar tabela service_requests (se não existir)
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

-- Habilitar RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies para service_requests
DROP POLICY IF EXISTS "Owners can view own requests" ON public.service_requests;
CREATE POLICY "Owners can view own requests" ON public.service_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert for service_requests" ON public.service_requests;
CREATE POLICY "Public insert for service_requests" ON public.service_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update for service_requests" ON public.service_requests;
CREATE POLICY "Public update for service_requests" ON public.service_requests FOR UPDATE USING (true);

-- 5. Inserir usuários parceiros de teste
INSERT INTO public.users (id, name, email, role) VALUES
('partner1', 'AutoMaster Prime', 'contato@automasterprime.com', 'partner'),
('partner2', 'SafeDrive Seguros', 'atendimento@safedrive.com', 'partner')
ON CONFLICT (id) DO NOTHING;

-- 6. Atualizar parceiros existentes para terem user_id e service_area
UPDATE public.partners SET user_id = 'partner1', status = 'active', service_area = 'São Paulo' WHERE name = 'AutoMaster Prime' AND user_id IS NULL;
UPDATE public.partners SET user_id = 'partner2', status = 'active', service_area = 'Nacional' WHERE name = 'SafeDrive Seguros' AND user_id IS NULL;

-- Atualizar todos os outros parceiros para terem status active
UPDATE public.partners SET status = 'active' WHERE status IS NULL;

-- Fim da migração!
SELECT 'Migração concluída com sucesso!' AS resultado;
