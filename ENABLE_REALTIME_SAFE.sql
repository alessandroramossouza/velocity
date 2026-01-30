-- =====================================================
-- HABILITAR REALTIME - VERSÃO SEGURA
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Este script NÃO dá erro se a tabela já estiver adicionada!

-- =====================================================
-- FUNÇÃO HELPER (Executar primeiro)
-- =====================================================

-- Cria função que adiciona tabela apenas se não existir na publicação
CREATE OR REPLACE FUNCTION add_table_to_realtime(table_name text)
RETURNS void AS $$
BEGIN
    -- Verifica se a tabela já está na publicação
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = table_name
    ) THEN
        -- Adiciona apenas se não existir
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
        RAISE NOTICE 'Tabela % adicionada ao Realtime ✅', table_name;
    ELSE
        RAISE NOTICE 'Tabela % já está no Realtime ⏭️', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADICIONAR TABELAS AO REALTIME
-- =====================================================

-- Notificações
SELECT add_table_to_realtime('notifications');

-- Carros
SELECT add_table_to_realtime('cars');

-- Aluguéis
SELECT add_table_to_realtime('rentals');

-- Usuários
SELECT add_table_to_realtime('users');

-- Reviews
SELECT add_table_to_realtime('reviews');

-- Pagamentos
SELECT add_table_to_realtime('payments');

-- Parcelas
SELECT add_table_to_realtime('rental_installments');

-- Contratos assinados
SELECT add_table_to_realtime('signed_contracts');

-- Parceiros
SELECT add_table_to_realtime('partners');

-- Solicitações de serviço
SELECT add_table_to_realtime('service_requests');

-- =====================================================
-- VERIFICAR RESULTADO
-- =====================================================

SELECT 
    tablename, 
    '✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================

-- Você deve ver algo como:
-- notifications      ✅
-- cars               ✅
-- rentals            ✅
-- users              ✅
-- etc...

-- =====================================================
-- LIMPAR (Opcional - Remover função helper)
-- =====================================================

-- DROP FUNCTION IF EXISTS add_table_to_realtime(text);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- ✅ Pronto! Realtime habilitado com sucesso!
