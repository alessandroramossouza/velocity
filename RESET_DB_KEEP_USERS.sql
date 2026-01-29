-- SCRIPT PARA LIMPAR DADOS (MANTENDO USUÁRIOS)
-- Executar no Editor SQL do Supabase

BEGIN;

-- 1. Limpar Notificações
DELETE FROM public.notifications;

-- 2. Limpar Parcelas de Aluguel
DELETE FROM public.rental_installments;

-- 3. Limpar Avaliações
DELETE FROM public.reviews;

-- 4. Limpar Favoritos
DELETE FROM public.favorites;

-- 5. Limpar Solicitações de Serviço
DELETE FROM public.service_requests;

-- 6. Limpar Aluguéis (Isso deve ser feito antes de Carros devido a FK, mas depois de installments/reviews)
DELETE FROM public.rentals;

-- 7. Limpar Carros (Assume que os carros cadastrados são de teste)
-- Se quiser MANTER os carros, remova ou comente a linha abaixo.
DELETE FROM public.cars;

-- OBS: Não deletamos 'users' nem 'partners' para manter os acessos.

COMMIT;
