/*
  RUN THIS IN SUPABASE SQL EDITOR
  This migration adds a password column to the users table
  to support the new email/password login requirement.
*/

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password text;
