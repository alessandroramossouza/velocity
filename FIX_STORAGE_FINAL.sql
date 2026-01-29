-- ==================================================
-- FIX STORAGE FINAL - Permissões Públicas (Universal)
-- Execute no Supabase SQL Editor
-- ==================================================

-- 1. Garante que o bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpeza de policies anteriores
DROP POLICY IF EXISTS "Nuclear Access Authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Nuclear Access Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Full access to contracts for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Universal Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Universal Select Access" ON storage.objects;
DROP POLICY IF EXISTS "Universal Update Access" ON storage.objects;

-- 3. CRIAÇÃO DE POLICIES "UNIVERSAIS" (TO public)
-- Isso remove a restrição de role 'authenticated', permitindo upload
-- desde que a aplicação cliente tenha a chave de API correta.

CREATE POLICY "Universal Upload Access"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Universal Select Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contracts');

CREATE POLICY "Universal Update Access"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'contracts');

CREATE POLICY "Universal Delete Access"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'contracts');

-- Confirmação
SELECT * FROM storage.policies WHERE table_name = 'objects';
