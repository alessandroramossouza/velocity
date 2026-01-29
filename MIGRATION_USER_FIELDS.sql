-- ==================================================
-- MIGRATION USER FIELDS & DOCUMENTS
-- Execute no Supabase SQL Editor
-- ==================================================

-- 1. Create 'user-documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create Universal Policy for 'user-documents' (Same as contracts for dev speed)
-- WARNING: In production, user_id should be checked via RLS
DROP POLICY IF EXISTS "Universal Helper Policy" ON storage.objects;
CREATE POLICY "Universal Helper Policy"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'user-documents')
WITH CHECK (bucket_id = 'user-documents');

-- 3. Add Columns to 'users' table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text; -- Logradouro
ALTER TABLE users ADD COLUMN IF NOT EXISTS number text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS complement text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state text;

-- 4. Add Document URL Columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rg_url text; -- Image of RG/CNH
ALTER TABLE users ADD COLUMN IF NOT EXISTS proof_residence_url text;

-- 5. Helper function to check if columns exists (Optional, just confirming)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
