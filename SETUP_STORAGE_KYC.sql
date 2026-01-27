-- ============================================
-- VeloCity: Script para configurar o Storage de Verificação (KYC)
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Cria o Bucket 'verification' para salvar CNH e Selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification', 'verification', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remove policies antigas (se existirem) para evitar conflitos
DROP POLICY IF EXISTS "Verification Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Verification Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Verification Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Verification Public Delete" ON storage.objects;

-- 3. Permite leitura pública das imagens de verificação
CREATE POLICY "Verification Public Select"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification');

-- 4. Permite upload público (Simplificado para Demo)
CREATE POLICY "Verification Public Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verification');

-- 5. Permite atualização (para reenvio de documentos)
CREATE POLICY "Verification Public Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'verification');

-- 6. Permite deleção (para reenvio de documentos)
CREATE POLICY "Verification Public Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'verification');
