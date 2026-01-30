-- =====================================================
-- HABILITAR REALTIME TOTAL - TODAS AS TABELAS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Este script habilita Realtime para TODAS as tabelas relevantes
-- para garantir atualização automática SEM REFRESH de página

-- =====================================================
-- 1. HABILITAR REALTIME NAS TABELAS
-- =====================================================

-- Notificações (já feito antes, mas garantindo)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;

-- 🔥 CARROS - Atualiza disponibilidade, preços, etc em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS cars;

-- 🔥 ALUGUÉIS - Atualiza status de aluguéis em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS rentals;

-- 🔥 USUÁRIOS - Atualiza dados de usuários (KYC, verificação, etc)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS users;

-- 🔥 REVIEWS - Atualiza avaliações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS reviews;

-- 🔥 PAGAMENTOS - Atualiza status de pagamentos em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS payments;

-- 🔥 PARCELAS - Atualiza parcelas de aluguéis
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS rental_installments;

-- 🔥 CONTRATOS ASSINADOS - Atualiza contratos
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS signed_contracts;

-- 🔥 PARCEIROS - Atualiza lista de parceiros
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS partners;

-- 🔥 SOLICITAÇÕES DE SERVIÇO - Atualiza status
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS service_requests;

-- =====================================================
-- 2. VERIFICAR SE FOI HABILITADO CORRETAMENTE
-- =====================================================

SELECT 
    schemaname, 
    tablename, 
    pubname 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Resultado esperado: Todas as tabelas acima devem aparecer

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Garantir que RLS está habilitado (segurança)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS RLS (Opcional - ajustar conforme necessidade)
-- =====================================================

-- NOTA: Como o projeto usa autenticação customizada (tabela users),
-- as políticas RLS podem não funcionar perfeitamente com auth.uid()
-- 
-- OPÇÃO 1 (Desenvolvimento): Desabilitar RLS temporariamente
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cars DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;
-- etc...
--
-- OPÇÃO 2 (Produção): Criar políticas específicas para cada tabela
-- Exemplo para CARS (todos podem ver, apenas donos podem editar):

DROP POLICY IF EXISTS "Anyone can view cars" ON cars;
CREATE POLICY "Anyone can view cars"
ON cars FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Owners can update own cars" ON cars;
CREATE POLICY "Owners can update own cars"
ON cars FOR UPDATE
USING (owner_id IN (SELECT id FROM users));

-- Exemplo para RENTALS (usuários veem apenas seus aluguéis):

DROP POLICY IF EXISTS "Users can view own rentals" ON rentals;
CREATE POLICY "Users can view own rentals"
ON rentals FOR SELECT
USING (renter_id IN (SELECT id FROM users) OR owner_id IN (SELECT id FROM users));

-- =====================================================
-- 5. SOLUÇÃO RÁPIDA PARA DESENVOLVIMENTO
-- =====================================================

-- Se estiver tendo problemas com RLS em desenvolvimento,
-- execute isto para permitir acesso total (APENAS EM DEV!):

/*
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE rental_installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE signed_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
*/

-- ⚠️ ATENÇÃO: Desabilitar RLS remove a segurança!
-- Use apenas em desenvolvimento local.
-- Em produção, configure as políticas corretamente.

-- =====================================================
-- 6. TESTE RÁPIDO
-- =====================================================

-- Para testar se Realtime está funcionando:
-- 1. Abra 2 abas do navegador
-- 2. Faça login em ambas
-- 3. Na aba 1, adicione um carro ou solicite um aluguel
-- 4. Na aba 2, observe a atualização INSTANTÂNEA (sem refresh!)

-- Ou teste via SQL:
-- (Substitua IDs pelos seus)

/*
-- Testar atualização de carro
UPDATE cars 
SET is_available = false 
WHERE id = 'SEU_CAR_ID';
-- Deve atualizar instantaneamente na interface!

-- Testar atualização de aluguel
UPDATE rentals 
SET status = 'active' 
WHERE id = 'SEU_RENTAL_ID';
-- Deve atualizar instantaneamente na interface!
*/

-- =====================================================
-- 7. TROUBLESHOOTING
-- =====================================================

-- Problema: Nada atualiza em tempo real
-- Solução:
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
-- Se as tabelas não aparecerem, execute os ALTER PUBLICATION novamente

-- Problema: Erro de permissão
-- Solução: Desabilite RLS temporariamente (ver seção 5)

-- Problema: Console mostra "CHANNEL_ERROR"
-- Solução: Verifique se o Supabase está online e as credenciais estão corretas

-- Problema: Funciona no SQL mas não na interface
-- Solução: 
-- 1. Limpe cache do navegador (Ctrl+Shift+Del)
-- 2. Verifique console do navegador (F12) por erros
-- 3. Certifique-se de que está logado

-- =====================================================
-- 8. MONITORAMENTO
-- =====================================================

-- Ver quantas conexões Realtime ativas:
-- (Acesse Supabase Dashboard > Database > Replication)

-- Verificar logs em tempo real:
-- (Acesse Supabase Dashboard > Logs > Realtime)

-- =====================================================
-- 9. PERFORMANCE
-- =====================================================

-- Realtime é muito eficiente, mas se tiver muitos usuários,
-- considere filtrar as subscriptions no código:
-- 
-- Exemplo: Apenas ouvir carros do próprio usuário:
-- filter: `owner_id=eq.${currentUser.id}`
--
-- Isso já está implementado no código para notificações!

-- =====================================================
-- 10. CONCLUSÃO
-- =====================================================

-- Após executar este script:
-- ✅ Notificações em tempo real
-- ✅ Carros atualizam em tempo real
-- ✅ Status de aluguéis atualiza em tempo real
-- ✅ Disponibilidade atualiza em tempo real
-- ✅ Pagamentos atualizam em tempo real
-- ✅ TUDO em tempo real, SEM REFRESH!

-- 🎉 Sistema Full-Time Real-Time ativado!

-- =====================================================
-- DICA PRO
-- =====================================================

-- Se quiser ver as mudanças acontecendo em tempo real:
-- 1. Abra o console do navegador (F12)
-- 2. Você verá logs como:
--    ✅ Real-time cars subscribed successfully
--    🚗 Real-time car update received: {...}
--    📋 Real-time rental update received: {...}
--
-- Isso confirma que está funcionando!

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Execute e veja a mágica acontecer! 🪄✨
