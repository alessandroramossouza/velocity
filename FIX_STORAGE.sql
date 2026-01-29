-- ==========================================
-- FIX STORAGE - Criação e Permissões do Bucket
-- Execute no Supabase SQL Editor
-- ==========================================

-- 1. Tenta criar o bucket 'contracts' inserindo na tabela de sistema do Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de Segurança (Storage Policies)
-- Permite que usuários autenticados façam upload
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contracts');

-- Permite que qualquer pessoa (público) leia os contratos (para visualização no modal)
CREATE POLICY "Public can view contracts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contracts');

-- Permite update (para sobrescrever templates)
CREATE POLICY "Users can update own contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contracts');

-- Confirmação
SELECT * FROM storage.buckets WHERE id = 'contracts';
