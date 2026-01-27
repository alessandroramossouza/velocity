-- =====================================================
-- VeloCity: LIMPAR TODOS OS DADOS (EXCETO USUÁRIOS)
-- Execute no SQL Editor do Supabase
-- =====================================================

-- IMPORTANTE: Este script NÃO apaga a tabela USERS
-- Seus usuários cadastrados serão mantidos!

-- =====================================================
-- APAGAR DADOS DAS TABELAS (ordem importante por FK)
-- =====================================================

-- 1. Pagamentos e Cartões
DELETE FROM saved_cards;
DELETE FROM payments;

-- 2. Serviços e Parceiros
DELETE FROM service_requests;
DELETE FROM partners;

-- 3. Avaliações e Favoritos
DELETE FROM reviews;
DELETE FROM favorites;

-- 4. Aluguéis
DELETE FROM rentals;

-- 5. Carros
DELETE FROM cars;

-- =====================================================
-- RESET DE SEQUENCES (IDs voltam a começar do 1)
-- =====================================================
ALTER SEQUENCE IF EXISTS cars_id_seq RESTART WITH 1;

-- =====================================================
-- VERIFICAÇÃO - Confirma que usuários foram mantidos
-- =====================================================
SELECT 'Usuários mantidos:' as status, COUNT(*) as total FROM users;
