-- EMERGENCY FIX: Create notification_preferences table if missing
-- This will definitely create the table and fix the signup error

-- First, temporarily disable the trigger to prevent errors during table creation
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;

-- Create the notification_preferences table (this will not fail if it already exists)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email boolean DEFAULT true,
  push boolean DEFAULT false,
  types text[] DEFAULT ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies and recreate them
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;  
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
DROP POLICY IF EXISTS "service_role_all_notification_preferences" ON notification_preferences;

-- Create policies
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

-- CRITICAL: Service role policy for triggers
CREATE POLICY "service_role_all_notification_preferences"
  ON notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON notification_preferences TO authenticated;

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
  ON notification_preferences(user_id);

-- Create the trigger function with maximum error handling
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple insert with conflict handling
  INSERT INTO notification_preferences (user_id, email, push, types)
  VALUES (NEW.id, true, false, ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE'])
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE LOG 'notification_preferences error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Re-enable the trigger
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_preferences();

-- Insert preferences for existing users
INSERT INTO notification_preferences (user_id, email, push, types)
SELECT id, true, false, ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE']
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the table exists and has data
SELECT 
  'notification_preferences' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE email = true) as email_enabled,
  COUNT(*) FILTER (WHERE push = true) as push_enabled
FROM notification_preferences;

-- Show table structure
\d notification_preferences;
