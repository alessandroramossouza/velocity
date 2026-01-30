-- 1. Alter user_id to TEXT to support non-UUID IDs (like our custom generated ones)
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE TEXT;

-- 2. Drop existing RLS policies that rely on auth.uid() since we are using custom auth
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

-- 3. Enable permissive policies to allow the notification system to work with custom user IDs
-- Security Note: In a full prod app with true Auth, we would use auth.uid(). 
-- Here we rely on the client filter `eq('user_id', currentUser.id)`
CREATE POLICY "Enable read access for all users" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.notifications FOR DELETE USING (true);

-- 4. Ensure Realtime is configured
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
