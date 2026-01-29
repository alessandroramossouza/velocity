-- ========================================
-- SETUP CONTRACTS - Sistema de Contratos PDF
-- Execute este script no Supabase SQL Editor
-- ========================================

-- 1. Adiciona coluna para URL do contrato PDF na tabela de carros
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

-- 2. Tabela para armazenar contratos assinados
CREATE TABLE IF NOT EXISTS public.signed_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rental_id UUID REFERENCES public.rentals(id),
    car_id UUID,
    renter_id TEXT,
    owner_id TEXT,
    original_pdf_url TEXT NOT NULL,
    signed_pdf_url TEXT NOT NULL,
    signature_data TEXT, -- Base64 da assinatura do locatário
    renter_name TEXT,
    renter_cpf TEXT,
    renter_email TEXT,
    car_info TEXT, -- Ex: "Honda Civic 2024"
    rental_start_date DATE,
    rental_end_date DATE,
    total_price DECIMAL(10, 2),
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT, -- Para validade jurídica
    user_agent TEXT  -- Para validade jurídica
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_signed_contracts_rental ON public.signed_contracts(rental_id);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_renter ON public.signed_contracts(renter_id);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_car ON public.signed_contracts(car_id);

-- 4. Permissões
ALTER TABLE public.signed_contracts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.signed_contracts TO authenticated;
GRANT ALL ON public.signed_contracts TO service_role;
GRANT ALL ON public.signed_contracts TO anon;

-- 5. Confirma alteração na tabela cars
-- Verificação: SELECT column_name FROM information_schema.columns WHERE table_name = 'cars';

SELECT 'Setup de Contratos concluído com sucesso!' AS status;
