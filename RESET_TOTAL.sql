
-- ============================================
-- VELOCITY - MASTER RESET SCRIPT
-- ATENÇÃO: ISSO APAGA TODOS OS DADOS!
-- ============================================

-- 1. LIMPEZA TOTAL
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.rentals CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.cars CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. RECRIAR TABELAS

-- USERS
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'renter')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CARS
CREATE TABLE public.cars (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id TEXT REFERENCES public.users(id), -- Opcional FK
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    category TEXT CHECK (category IN ('SUV', 'Sedan', 'Hatchback', 'Luxury', 'Sports')),
    price_per_day DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT,
    features TEXT[],
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RENTALS
CREATE TABLE public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id BIGINT REFERENCES public.cars(id) ON DELETE CASCADE,
    renter_id TEXT REFERENCES public.users(id), -- FK para User
    owner_id TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
    car_id BIGINT REFERENCES public.cars(id) ON DELETE CASCADE,
    renter_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAVORITES
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.users(id),
    car_id BIGINT REFERENCES public.cars(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, car_id)
);

-- 3. PERMISSÕES (RLS OFF para Demo, ou permissivo)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Cars" ON public.cars FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Rentals" ON public.rentals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Favorites" ON public.favorites FOR ALL USING (true) WITH CHECK (true);

-- 4. SEED (DADOS INICIAIS)

-- Criar Usuários Padrão
INSERT INTO public.users (id, name, email, role) VALUES 
('1', 'Carlos Donono', 'dono@velocity.com', 'owner'),
('2', 'Ana Cliente', 'cliente@velocity.com', 'renter');

-- Criar Carros Iniciais
INSERT INTO public.cars (owner_id, make, model, year, category, price_per_day, description, features, image_url, is_available) VALUES
('1', 'Toyota', 'Corolla', 2023, 'Sedan', 250.00, 'Sedan confortável e econômico, perfeito para viagens longas.', ARRAY['Ar Condicionado', 'Bluetooth', 'Câmera de Ré'], 'https://images.unsplash.com/photo-1623869675781-80e6568f3852?auto=format&fit=crop&q=80&w=800', true),
('1', 'Jeep', 'Renegade', 2022, 'SUV', 350.00, 'SUV robusto para qualquer terreno.', ARRAY['4x4', 'GPS', 'Teto Solar'], 'https://images.unsplash.com/photo-1696582987103-6056557e494a?auto=format&fit=crop&q=80&w=800', true),
('1', 'BMW', '320i', 2024, 'Luxury', 800.00, 'Experiência de luxo e performance alemã.', ARRAY['Couro', 'Piloto Automático', 'Som Premium'], 'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&q=80&w=800', true);

