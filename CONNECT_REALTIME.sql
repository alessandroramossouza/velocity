-- 🚨 RECONNECT REALTIME SYSTEM 🚨
-- This is the missing link! When the table was recreated, it was disconnected from the live notification system.
-- This script explicitly reconnects the 'notifications' table to the 'supabase_realtime' publication.

DO $$
BEGIN
  -- Check if the table is already in the publication to avoid errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    -- Connect the table to the Realtime broadcast system
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;

-- Verify setup
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
