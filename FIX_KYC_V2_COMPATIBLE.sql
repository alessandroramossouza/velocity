-- =====================================================
-- FIX KYC & VERIFICATION SYSTEM V2 (COMPATIBLE MODE)
-- Fixes UUID vs TEXT errors in RLS policies
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

-- Allow users to view
CREATE POLICY "Users can view verification docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'verification');

-- 2. Ensure Users Table Columns
DO $$
BEGIN
    -- Add KYC columns if missing to public.users
    -- Using safe ALTER statements
    
    -- Check if table exists first needed? Assuming public.users exists based on error context.
    
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cnh_url TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selfie_url TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'renter';

    -- Enable RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
END $$;

-- 3. Users RLS Policies (FIXED WITH CASTS)
-- We cast both sides to text to be safe regardless of underlying type (UUID or TEXT)

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Anyone can view basic user info" ON public.users; 
CREATE POLICY "Anyone can view basic user info" ON public.users
FOR SELECT USING (true); 

-- 4. Trigger for new users (Robustness)
-- Updates logic to handle conflict safely
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id, -- If users.id is TEXT, Postgres usually auto-casts UUID to TEXT on insert if needed
    new.email, 
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'renter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ KYC System V2 Fixed: Policies updated with robust type casting!';
END $$;
