-- =====================================================
-- V3.4 PARTNER PORTAL - COMPLETO (Inclui criação da tabela partners)
-- Execute este arquivo no Supabase SQL Editor
-- =====================================================

-- 1. Garantir extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update users table to allow 'partner' role
-- Primeiro, removemos a constraint antiga se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_role_check;
    END IF;
END $$;

-- Adicionar nova constraint com 'partner'
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('renter', 'owner', 'partner'));

-- 3. Criar tabela partners (se não existir)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('mechanic', 'insurance')) NOT NULL,
    description TEXT,
    contact_info TEXT,
    rating NUMERIC DEFAULT 5.0,
    image_url TEXT,
    benefits JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected')),
    address TEXT,
    service_area TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies para partners
DROP POLICY IF EXISTS "Allow public read access to partners" ON public.partners;
CREATE POLICY "Allow public read access to partners" ON public.partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to partners" ON public.partners;
CREATE POLICY "Allow public insert to partners" ON public.partners FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to partners" ON public.partners;
CREATE POLICY "Allow public update to partners" ON public.partners FOR UPDATE USING (true);

-- 4. Criar tabela service_requests
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

-- 6. Inserir parceiros de exemplo
INSERT INTO public.partners (user_id, name, type, description, contact_info, rating, image_url, benefits, status, service_area)
VALUES 
(
    'partner1',
    'AutoMaster Prime', 
    'mechanic', 
    'Especializada em carros de luxo e esportivos. Atendimento 24h para parceiros VeloCity.', 
    '(11) 99999-1001', 
    4.9, 
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
    '["Desconto de 20% em mão de obra", "Prioridade no atendimento", "Diagnóstico gratuito"]'::jsonb,
    'active',
    'São Paulo - Zona Sul'
),
(
    'partner2',
    'SafeDrive Seguros', 
    'insurance', 
    'Seguro completo para frotas de aluguel. Cobertura nacional e assistência 24h.', 
    'contato@safedrive.com', 
    4.8, 
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=600&q=80',
    '["Cobertura total", "Carro reserva incluso", "Desconto para frotas"]'::jsonb,
    'active',
    'Nacional'
),
(
    NULL,
    'TechCar Oficina', 
    'mechanic', 
    'Especialistas em diagnóstico eletrônico e manutenção preventiva.', 
    '(11) 98765-4321', 
    4.7, 
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
    '["Diagnóstico eletrônico", "Peças originais", "Garantia de serviço"]'::jsonb,
    'active',
    'São Paulo - Zona Norte'
),
(
    NULL,
    'Proteção Total Seguros', 
    'insurance', 
    'Planos flexíveis para todos os tipos de veículos e frotas.', 
    '0800 123 4567', 
    4.6, 
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80',
    '["Planos personalizados", "Franquia reduzida", "APP exclusivo"]'::jsonb,
    'active',
    'Nacional'
)
ON CONFLICT DO NOTHING;

-- Fim da migração!
-- Agora você pode acessar o sistema e testar o Portal de Parceiros.
