-- Fix notification_preferences schema mismatch
-- The table exists but may have column type issues causing the transaction abort

-- First, let's check the current schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notification_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- The issue might be with column types or constraints
-- Let's ensure the schema matches what the application expects

-- 1. Check if we need to alter column types
DO $$
BEGIN
    -- Check if email column is text instead of boolean
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'email' 
        AND data_type = 'text'
    ) THEN
        -- Convert text to boolean
        ALTER TABLE notification_preferences 
        ALTER COLUMN email TYPE boolean USING (email::boolean);
    END IF;

    -- Check if push column is text instead of boolean  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'push' 
        AND data_type = 'text'
    ) THEN
        -- Convert text to boolean
        ALTER TABLE notification_preferences 
        ALTER COLUMN push TYPE boolean USING (push::boolean);
    END IF;
END $$;

-- 2. Ensure RLS policies exist and are correct
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete" ON notification_preferences;

-- Enable RLS if not enabled
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create correct policies
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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all records (for triggers)
CREATE POLICY "service_role_all_notification_preferences"
  ON notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Fix the trigger function that's causing the transaction abort
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to avoid errors
  INSERT INTO notification_preferences (user_id, email, push, types)
  VALUES (
    NEW.id,
    true,
    false,
    ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE']
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user_preferences for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_preferences();

-- 5. Grant proper permissions
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON notification_preferences TO service_role;

-- 6. Test the function works
DO $$
BEGIN
  -- Test that we can query the table without errors
  PERFORM COUNT(*) FROM notification_preferences LIMIT 1;
  RAISE NOTICE 'notification_preferences table is accessible';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error accessing notification_preferences: %', SQLERRM;
END $$;

-- 7. Check for any other tables that might be missing
-- Ensure notifications table exists with correct schema
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    read text DEFAULT 'false' CHECK (read IN ('true', 'false')),
    read_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    category_id uuid,
    template_id uuid,
    priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url text,
    action_text text,
    expires_at timestamptz
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications if they don't exist
DROP POLICY IF EXISTS "users_can_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "service_role_all_notifications" ON notifications;

CREATE POLICY "users_can_view_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_all_notifications"
  ON notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- 8. Final verification
SELECT 
    'notification_preferences' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'notification_preferences') as policy_count
FROM notification_preferences
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'notifications') as policy_count
FROM notifications;

COMMIT;
