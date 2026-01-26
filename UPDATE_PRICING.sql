
-- ============================================
-- SCRIPT: PREÇOS POR PERÍODO (UPDATE)
-- ============================================

-- Adicionar colunas para preços semanais e mensais
ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS price_per_week DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_per_month DECIMAL(10, 2);

-- Atualizar os carros existentes para ter algum valor (opcional, base 7x e 30x com desconto)
UPDATE public.cars 
SET price_per_week = price_per_day * 7 * 0.9, -- 10% desconto
    price_per_month = price_per_day * 30 * 0.8 -- 20% desconto
WHERE price_per_week IS NULL;
