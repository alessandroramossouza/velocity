-- =====================================================
-- HABILITAR REALTIME PARA NOTIFICAÇÕES
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Habilitar Realtime na tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Verificar se a tabela foi adicionada (opcional)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 3. Garantir que Row Level Security está configurado
-- (As políticas RLS já devem existir, mas vamos garantir)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. Política para permitir que usuários vejam apenas suas notificações
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM users));

-- 5. Política para permitir INSERT de notificações (sistema/triggers)
DROP POLICY IF EXISTS "Allow notification inserts" ON notifications;
CREATE POLICY "Allow notification inserts"
ON notifications FOR INSERT
WITH CHECK (true);

-- 6. Política para permitir UPDATE (marcar como lida)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM users));

-- =====================================================
-- INSTRUÇÕES ADICIONAIS
-- =====================================================

-- NOTA IMPORTANTE:
-- Se você estiver usando autenticação customizada (tabela users sem Supabase Auth),
-- as políticas RLS acima podem não funcionar perfeitamente.
-- 
-- SOLUÇÃO ALTERNATIVA (Desenvolvimento/MVP):
-- Desabilitar RLS temporariamente para permitir acesso total:

-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ⚠️ ATENÇÃO: Isso remove a segurança. Use apenas em desenvolvimento!
-- Em produção, implemente Supabase Auth corretamente.

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se Realtime está habilitado:
SELECT 
    schemaname, 
    tablename, 
    pubname 
FROM pg_publication_tables 
WHERE tablename = 'notifications';

-- Se retornar uma linha com pubname = 'supabase_realtime', está funcionando!

-- =====================================================
-- TESTE DE NOTIFICAÇÃO (Opcional)
-- =====================================================

-- Para testar se o Realtime está funcionando, insira uma notificação:
-- (Substitua 'USER_ID_AQUI' pelo ID de um usuário existente)

/*
INSERT INTO notifications (user_id, type, title, message, is_read)
VALUES (
    'USER_ID_AQUI',
    'general',
    'Teste de Notificação em Tempo Real',
    'Se você recebeu esta notificação instantaneamente com som, o Realtime está funcionando! 🎉',
    false
);
*/

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Se não funcionar, verifique:
-- 1. Dashboard do Supabase > Database > Replication
-- 2. Certifique-se de que a tabela 'notifications' está na lista
-- 3. Se não estiver, adicione manualmente pela interface
-- 4. Ou execute: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
