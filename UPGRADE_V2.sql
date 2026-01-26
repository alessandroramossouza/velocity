
-- ============================================
-- VELOCITY 2.0 - NOVAS TABELAS
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. TABELA DE ALUGUÉIS (Rentals)
-- Registra cada aluguel com datas e status
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
    renter_id TEXT NOT NULL, -- ID do locatário
    owner_id TEXT NOT NULL, -- ID do dono (para facilitar queries)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE AVALIAÇÕES (Reviews)
-- Avaliações de carros pelos locatários
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
    renter_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE FAVORITOS (Favorites)
-- Carros favoritados pelos usuários
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, car_id) -- Evita duplicados
);

-- 4. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rentals_car ON public.rentals(car_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter ON public.rentals(renter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_car ON public.reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);

-- 5. POLÍTICAS DE ACESSO (RLS)
-- Permitir acesso público para demo (ajustar em produção)
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para demo
CREATE POLICY "Allow all rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all favorites" ON public.favorites FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
