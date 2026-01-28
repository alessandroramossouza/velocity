-- ============================================
-- VeloCity: Setup Admin Role & User
-- Execute in Supabase SQL Editor
-- ============================================

-- 1. Update Constraint for Role
-- Note: We can't easily ALTER a check constraint in generic SQL without dropping it first.
-- We will try to update it, or if that fails, we suggest a recreation.
-- For Supabase specifically:

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('renter', 'owner', 'partner', 'admin'));

-- 2. Create/Promote Admin User
-- This inserts a new admin or updates an existing one if the ID conflicts (simplified for this context)
-- In a real app, you'd likely update a specific user by email.

-- Example: Making sure we have an admin
INSERT INTO public.users (id, name, email, role)
VALUES 
    ('admin_user', 'Administrador VeloCity', 'admin@velocity.com', 'admin')
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';

-- 3. Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ Admin role enabled successfully!';
    RAISE NOTICE '👤 Admin user (admin@velocity.com) created/updated.';
END $$;
