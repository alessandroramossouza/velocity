-- =====================================================
-- REALTIME - VERSÃO SUPER SIMPLES
-- Copie e cole no Supabase SQL Editor
-- =====================================================

-- Execute as 3 linhas abaixo:

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE cars;
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;

-- =====================================================
-- PRONTO! ✅
-- =====================================================

-- Para verificar se funcionou, execute:
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Deve mostrar:
-- notifications
-- cars
-- rentals

-- =====================================================
-- SE DER ERRO "já existe"
-- =====================================================

-- Isso significa que já está habilitado! 
-- É NORMAL e está FUNCIONANDO! ✅

-- Se quiser "resetar", execute:
/*
ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE cars;
ALTER PUBLICATION supabase_realtime DROP TABLE rentals;
*/

-- Depois execute as 3 linhas do início novamente.

-- =====================================================
-- FIM
-- =====================================================
