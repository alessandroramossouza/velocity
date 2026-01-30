-- =====================================================
-- HABILITAR REALTIME TOTAL - SCRIPT CORRIGIDO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. HABILITAR REALTIME NAS TABELAS
-- =====================================================

-- Notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Carros (disponibilidade, preços em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE cars;

-- Aluguéis (status em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;

-- Usuários (KYC, verificação)
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Reviews
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

-- Pagamentos
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Parcelas
ALTER PUBLICATION supabase_realtime ADD TABLE rental_installments;

-- Contratos assinados
ALTER PUBLICATION supabase_realtime ADD TABLE signed_contracts;

-- Parceiros
ALTER PUBLICATION supabase_realtime ADD TABLE partners;

-- Solicitações de serviço
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;

-- =====================================================
-- 2. VERIFICAR SE FOI HABILITADO
-- =====================================================

SELECT 
    schemaname, 
    tablename, 
    pubname 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =====================================================
-- RESULTADO ESPERADO:
-- Você deve ver todas as tabelas listadas acima
-- =====================================================

-- =====================================================
-- 3. SE DER ERRO "já existe"
-- =====================================================

-- Se aparecer erro dizendo que a tabela já está na publicação,
-- É porque já foi adicionada antes. Isso é NORMAL e ESPERADO!
-- O Realtime continuará funcionando perfeitamente.

-- Para remover e adicionar novamente (se necessário):
/*
ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE cars;
ALTER PUBLICATION supabase_realtime DROP TABLE rentals;
-- etc...

-- Depois adicione novamente
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE cars;
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
-- etc...
*/

-- =====================================================
-- 4. TESTE RÁPIDO
-- =====================================================

-- Execute esta query para confirmar que está funcionando:
SELECT COUNT(*) as total_tables_realtime
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Deve retornar um número > 0 (idealmente 10 ou mais)

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Execute linha por linha ou tudo de uma vez! ✅
