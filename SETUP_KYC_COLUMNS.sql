-- ============================================
-- VeloCity: Script para adicionar colunas KYC na tabela users
-- Execute este script APÓS o SETUP_STORAGE_KYC.sql
-- ============================================

-- Adiciona colunas de verificação KYC na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS cnh_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ;
