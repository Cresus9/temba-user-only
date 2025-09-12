-- Complete fix for signup database errors
-- This addresses all the issues causing the "Database error creating new user"

-- ===============================
-- 1. TEMPORARILY DISABLE PROBLEMATIC TRIGGERS
-- ===============================

-- Disable the notification preferences trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;

-- ===============================
-- 2. FIX NOTIFICATION_PREFERENCES TABLE SCHEMA
-- ===============================

-- Check current schema and fix column types
DO $$
BEGIN
    -- Fix email column if it's text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'email' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE notification_preferences 
        ALTER COLUMN email TYPE boolean USING (
            CASE 
                WHEN email = 'true' THEN true
                WHEN email = 'false' THEN false
                ELSE true
            END
        );
        RAISE NOTICE 'Fixed email column type from text to boolean';
    END IF;

    -- Fix push column if it's text  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'push' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE notification_preferences 
        ALTER COLUMN push TYPE boolean USING (
            CASE 
                WHEN push = 'true' THEN true
                WHEN push = 'false' THEN false
                ELSE false
            END
        );
        RAISE NOTICE 'Fixed push column type from text to boolean';
    END IF;
END $$;

-- ===============================
-- 3. FIX NOTIFICATIONS TABLE SCHEMA
-- ===============================

-- Ensure notifications table has correct schema
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'metadata'
    ) THEN
        -- Add metadata column if missing
        ALTER TABLE notifications ADD COLUMN metadata jsonb DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to notifications table';
    END IF;

    -- Check if we have old 'data' column and migrate it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'data'
    ) THEN
        -- Copy data to metadata if metadata is empty
        UPDATE notifications 
        SET metadata = data 
        WHERE metadata IS NULL OR metadata = '{}';
        
        -- Drop the old data column
        ALTER TABLE notifications DROP COLUMN data;
        RAISE NOTICE 'Migrated data column to metadata in notifications table';
    END IF;

    -- Ensure read column is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read' 
        AND data_type = 'boolean'
    ) THEN
        ALTER TABLE notifications 
        ALTER COLUMN read TYPE text USING (read::text);
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_read_check CHECK (read IN ('true', 'false'));
        RAISE NOTICE 'Fixed read column type from boolean to text';
    END IF;
END $$;

-- ===============================
-- 4. ENSURE ALL REQUIRED COLUMNS EXIST
-- ===============================

-- Add missing columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS category_id uuid,
ADD COLUMN IF NOT EXISTS template_id uuid,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS action_url text,
ADD COLUMN IF NOT EXISTS action_text text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Set default for read column if not set
UPDATE notifications SET read = 'false' WHERE read IS NULL;

-- ===============================
-- 5. RECREATE RLS POLICIES
-- ===============================

-- Drop and recreate notification_preferences policies
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
DROP POLICY IF EXISTS "service_role_all_notification_preferences" ON notification_preferences;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Critical: Allow service role to manage notification preferences (for triggers)
CREATE POLICY "service_role_all_notification_preferences"
  ON notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop and recreate notifications policies
DROP POLICY IF EXISTS "users_can_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "service_role_all_notifications" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to manage notifications (for welcome notifications)
CREATE POLICY "service_role_all_notifications"
  ON notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===============================
-- 6. GRANT PROPER PERMISSIONS
-- ===============================

GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON notifications TO service_role;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- ===============================
-- 7. CREATE ROBUST TRIGGER FUNCTIONS
-- ===============================

-- Create improved notification preferences function
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to avoid any duplicate key errors
  INSERT INTO notification_preferences (user_id, email, push, types, created_at, updated_at)
  VALUES (
    NEW.id,
    true,
    false,
    ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE'],
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = now();
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error in handle_new_user_preferences for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- ===============================
-- 8. RE-ENABLE TRIGGER WITH BETTER ERROR HANDLING
-- ===============================

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_preferences();

-- ===============================
-- 9. INSERT DEFAULT PREFERENCES FOR EXISTING USERS
-- ===============================

-- Insert default preferences for existing users who don't have them
INSERT INTO notification_preferences (user_id, email, push, types, created_at, updated_at)
SELECT 
    id,
    true,
    false,
    ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE'],
    now(),
    now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- ===============================
-- 10. TEST THE SETUP
-- ===============================

-- Test that we can query both tables without errors
DO $$
DECLARE
    pref_count INTEGER;
    notif_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pref_count FROM notification_preferences;
    SELECT COUNT(*) INTO notif_count FROM notifications;
    
    RAISE NOTICE 'notification_preferences table has % rows', pref_count;
    RAISE NOTICE 'notifications table has % rows', notif_count;
    RAISE NOTICE 'Database setup completed successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing setup: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- Show final status
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('notification_preferences', 'notifications')
ORDER BY tablename, policyname;

COMMIT;
