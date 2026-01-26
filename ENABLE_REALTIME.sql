
-- ============================================
-- SCRIPT: ATIVAR REALTIME NA TABELA RENTALS
-- ============================================

-- Adiciona a tabela rentals à publicação do Supabase Realtime
-- Isso permite que o Frontend "escute" mudanças (Inserts/Updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rentals;

-- Opcional: Adicionar users também, caso queira ver novos cadastros
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
