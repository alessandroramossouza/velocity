-- =====================================================
-- FIX KYC & VERIFICATION SYSTEM (ULTRA STRONG)
-- =====================================================

-- 1. Ensure Storage Bucket exists and has policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification', 'verification', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view verification docs" ON storage.objects;

-- Allow authenticated users to upload to 'verification' bucket
CREATE POLICY "Users can upload their own verification docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification');

-- Allow users to view (public needed since we are using publicUrl in the frontend for simplicity, 
-- ideally should use signedUrl, but keeping consistent with existing logic)
CREATE POLICY "Users can view verification docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'verification');

-- 2. Ensure Users Table has correct columns and types
-- We are assuming 'users' table exists in public schema (synced with auth.users)
-- If not, we might need to look at 'profiles' or create it.

DO $$
BEGIN
    -- Check if users table exists, if not assume it's `profiles` or create `users`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating users table...';
        CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT,
            email TEXT,
            role TEXT DEFAULT 'renter',
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Add KYC columns if missing
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cnh_url TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selfie_url TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;
    
    -- Ensure role column exists (critical for logic)
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'renter';

    -- Fix RLS on users table
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
END $$;

-- 3. Users RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view basic user info" ON public.users; 
-- (Optional: needed if owners need to see renter name)
CREATE POLICY "Anyone can view basic user info" ON public.users
FOR SELECT USING (true); 

-- 4. Create a trigger to auto-create user in public.users when auth.user is created (Robustness)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'renter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ KYC System Fixed: Bucket created, Table columns added, Policies applied.';
END $$;
