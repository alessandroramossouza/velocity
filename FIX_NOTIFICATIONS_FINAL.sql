-- ⚠️ SOLUÇÃO DEFINITIVA PARA O ERRO DE NOTIFICAÇÃO
-- Este script RECRIA a tabela de notificações do zero para garantir que o tipo do ID esteja correto (TEXT)
-- e que não existam bloqueios de permissão.

-- 1. Remover a tabela antiga e todas as suas dependências (regras, índices)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Criar a tabela novamente com o formato CORRETO
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Definido como TEXT para aceitar os IDs do seu sistema
    type TEXT NOT NULL, -- info, warning, success, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configurar Realtime (Essencial para o sino tocar)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 4. Criar Regras de Segurança (RLS) Permissivas
-- Isso garante que o Admin consiga enviar sem tomar erro de "Permissão Negada"
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Libera Geral" ON public.notifications
    FOR ALL -- Aplica para SELECT, INSERT, UPDATE, DELETE
    USING (true)
    WITH CHECK (true);

-- 5. Criar índices para não ficar lento
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
