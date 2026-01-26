
-- ============================================
-- VELOCITY V3.0 - NOVAS FUNCIONALIDADES
-- KYC, Reviews 2.0, Payments
-- ============================================

-- 1. KYC - Verificação de Identidade
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cnh_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;

-- 2. Reviews 2.0 - Avaliações Bilaterais
-- Adicionar campo para indicar quem está avaliando quem
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS reviewer_type TEXT DEFAULT 'renter_to_car',
ADD COLUMN IF NOT EXISTS reviewed_user_id TEXT;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_type ON public.reviews(reviewer_type);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user ON public.reviews(reviewed_user_id);

-- 3. Payments - Tabela de Transações
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    external_id TEXT,
    payer_id TEXT,
    receiver_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS (ignorar erro se já habilitado)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Dropar política existente se houver, antes de criar
DROP POLICY IF EXISTS "Public Payments" ON public.payments;
CREATE POLICY "Public Payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- Realtime (ignorar erro se já adicionado)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Mensagem de sucesso
SELECT 'V3 Features instaladas com sucesso!' as status;
