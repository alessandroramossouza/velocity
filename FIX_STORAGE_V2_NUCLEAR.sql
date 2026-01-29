-- ==================================================
-- FIX STORAGE V2 NUCLEAR - Permissões Totais
-- Execute no Supabase SQL Editor
-- ==================================================

-- 1. Garante que o bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. REMOVE TODAS AS POLÍTICAS ANTIGAS (Limpeza)
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Full access to contracts for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- 3. CRIA POLÍTICAS PERMISSIVAS (NUCLEAR OPTION)

-- Permite QUALQUER operação (INSERT, UPDATE, SELECT, DELETE) para usuários logados no bucket contracts
CREATE POLICY "Nuclear Access Authenticated"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');

-- Permite LEITURA para qualquer um (Público)
CREATE POLICY "Nuclear Access Public Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contracts');

-- Confirmação
SELECT * FROM storage.buckets WHERE id = 'contracts';
