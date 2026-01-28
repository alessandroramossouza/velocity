-- ============================================
-- VeloCity: Setup for Digital Contracts & Signatures
-- Execute in Supabase SQL Editor
-- ============================================

-- 1. Create Bucket for Signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove old policies to avoid conflict
DROP POLICY IF EXISTS "Signatures Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Signatures Public Insert" ON storage.objects;

-- Create Policies
CREATE POLICY "Signatures Public Select"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');

-- In production, this should be restricted to authenticated users
CREATE POLICY "Signatures Public Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures');

-- 2. Update Rentals Table
-- Add columns to store contract snapshot and signature metadata
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS contract_snapshot TEXT, -- The full HTML/Text of contract agreed upon
ADD COLUMN IF NOT EXISTS signature_url TEXT,     -- URL to the signature image
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,  -- When it was signed
ADD COLUMN IF NOT EXISTS signer_ip TEXT,         -- IP address (audit trail)
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;

-- 3. Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ Digital Contracts system ready!';
    RAISE NOTICE '📊 Table updated: rentals';
    RAISE NOTICE '🗄️ Storage bucket created: signatures';
END $$;
