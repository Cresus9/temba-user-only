-- Comprehensive Production Database Fix
-- This script ensures all required tables, functions, and triggers exist for the notification system

-- ===============================
-- 1. UTILITY FUNCTIONS
-- ===============================

-- Create handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 2. NOTIFICATION_PREFERENCES TABLE
-- ===============================

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email boolean DEFAULT true,
  push boolean DEFAULT false,
  types text[] DEFAULT ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE', 'PRICE_CHANGE', 'EVENT_CANCELLED', 'EVENT_UPDATED'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;

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

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
  ON notification_preferences(user_id);

-- ===============================
-- 3. USER_PUSH_TOKENS TABLE
-- ===============================

-- Create user_push_tokens table for mobile notifications
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_push_tokens_user_id_key UNIQUE(user_id)
);

-- Enable RLS for push tokens
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "users_can_manage_push_tokens" ON user_push_tokens;
CREATE POLICY "users_can_manage_push_tokens" ON user_push_tokens
    FOR ALL USING (auth.uid() = user_id);

-- ===============================
-- 4. NOTIFICATION PREFERENCE FUNCTIONS
-- ===============================

-- Create or replace function to handle new user preferences
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    updated_at = now()
  WHERE notification_preferences.user_id = NEW.id;
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user_preferences: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for new users if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_preferences();

-- Create or replace function to handle preference updates
CREATE OR REPLACE FUNCTION handle_preference_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for preference updates if it doesn't exist
DROP TRIGGER IF EXISTS update_preferences_timestamp ON notification_preferences;
CREATE TRIGGER update_preferences_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_preference_update();

-- ===============================
-- 5. ENSURE NOTIFICATIONS TABLE EXISTS
-- ===============================

-- Ensure notifications table exists with correct schema
DO $$
BEGIN
    -- Check if notifications table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        -- Create notifications table
        CREATE TABLE notifications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            type text NOT NULL,
            title text NOT NULL,
            message text NOT NULL,
            metadata jsonb,
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
        
        -- Enable RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own notifications"
          ON notifications FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);

        CREATE POLICY "Users can update own notifications"
          ON notifications FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id);

        -- Create indexes
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX idx_notifications_read ON notifications(read);
        CREATE INDEX idx_notifications_created_at ON notifications(created_at);
        CREATE INDEX idx_notifications_type ON notifications(type);
    ELSE
        -- Add missing columns if they don't exist
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS category_id uuid,
        ADD COLUMN IF NOT EXISTS template_id uuid,
        ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        ADD COLUMN IF NOT EXISTS action_url text,
        ADD COLUMN IF NOT EXISTS action_text text,
        ADD COLUMN IF NOT EXISTS expires_at timestamptz;
        
        -- Update read column to text if it's boolean
        DO $inner$
        BEGIN
            -- Check if read column is boolean and convert to text
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' 
                AND column_name = 'read' 
                AND data_type = 'boolean'
            ) THEN
                ALTER TABLE notifications ALTER COLUMN read TYPE text USING (read::text);
                ALTER TABLE notifications ADD CONSTRAINT notifications_read_check CHECK (read IN ('true', 'false'));
            END IF;
        END $inner$;
    END IF;
END $$;

-- ===============================
-- 6. INSERT DEFAULT PREFERENCES FOR EXISTING USERS
-- ===============================

-- Insert default preferences for existing users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- ===============================
-- 7. VERIFY PERMISSIONS
-- ===============================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON user_push_tokens TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT SELECT ON notification_preferences TO anon;
GRANT SELECT ON notifications TO anon;

-- ===============================
-- 8. VERIFICATION QUERIES
-- ===============================

-- Show table status
SELECT 
    'notification_preferences' as table_name,
    COUNT(*) as row_count,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences') as has_rls_policies
FROM notification_preferences
UNION ALL
SELECT 
    'user_push_tokens' as table_name,
    COUNT(*) as row_count,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens') as has_rls_policies
FROM user_push_tokens
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as row_count,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'notifications') as has_rls_policies
FROM notifications;

-- Show function status
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'handle_new_user_preferences',
    'handle_preference_update',
    'handle_updated_at',
    'update_updated_at_column'
);

-- Show trigger status
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'on_auth_user_created_preferences',
    'update_preferences_timestamp'
);

COMMIT;
