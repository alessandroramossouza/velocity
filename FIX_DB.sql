
-- ============================================
-- SCRIPT DE CORREÇÃO GERAL (VeloCity)
-- ============================================

-- 1. Garantir que a tabela RENTALS existe e tem os tipos certos
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id BIGINT REFERENCES public.cars(id) ON DELETE CASCADE,
    renter_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Garantir permissões (Desativa e Reativa RLS corrigido)
ALTER TABLE public.rentals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars DISABLE ROW LEVEL SECURITY;

-- 3. Se preferir manter RLS ativado, use estas políticas permissivas:
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all rentals" ON public.rentals;
CREATE POLICY "Allow all rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users" ON public.users;
CREATE POLICY "Allow all users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 4. Limpeza de usuários duplicados (Mantém o mais antigo)
-- Isso evita erro no Login se você cadastrou o mesmo email 2 vezes
DELETE FROM public.users a USING public.users b
WHERE a.id > b.id AND a.email = b.email;

-- 5. Adicionar Constraint UNIQUE no email para evitar duplicatas futuras
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
