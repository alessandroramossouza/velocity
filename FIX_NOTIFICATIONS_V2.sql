-- 1. DROP POLICIES FIRST (Crucial Step: Must be done before altering column)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.notifications;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.notifications;

-- 2. NOW Alter user_id to TEXT
-- Using 'USING user_id::text' ensures safe conversion if there's data
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 3. Re-create permissive policies for the text-based ID system
CREATE POLICY "Enable read access for all users" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.notifications FOR UPDATE USING (true);

-- 4. Verify Realtime trigger
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
