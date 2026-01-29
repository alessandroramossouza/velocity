/* 
  RUN THIS IN SUPABASE SQL EDITOR 
  This migration adds the necessary columns to the users table 
  and sets up the storage for documents.
*/

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS complement text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS cpf_url text,
ADD COLUMN IF NOT EXISTS proof_residence_url text;

-- Check if bucket exists, if not create (Postgres function style or just insert)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-documents', 'user-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies (Simplified for development)
CREATE POLICY "Public Upload Docs" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'user-documents' );

CREATE POLICY "Public Read Docs" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'user-documents' );
