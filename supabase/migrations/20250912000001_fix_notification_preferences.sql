-- Fix missing notification_preferences table in production
-- This migration ensures the notification_preferences table exists with all required components

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

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_preferences'
        AND policyname = 'notification_preferences_select'
    ) THEN
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
    -- Select policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_preferences'
        AND policyname = 'notification_preferences_select'
    ) THEN
        CREATE POLICY "notification_preferences_select"
          ON notification_preferences FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;

    -- Insert policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_preferences'
        AND policyname = 'notification_preferences_insert'
    ) THEN
        CREATE POLICY "notification_preferences_insert"
          ON notification_preferences FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_preferences'
        AND policyname = 'notification_preferences_update'
    ) THEN
        CREATE POLICY "notification_preferences_update"
          ON notification_preferences FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
  ON notification_preferences(user_id);

-- Create or replace function to handle new users
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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_preferences'
    ) THEN
        CREATE TRIGGER on_auth_user_created_preferences
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION handle_new_user_preferences();
    END IF;
END $$;

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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_preferences_timestamp'
    ) THEN
        CREATE TRIGGER update_preferences_timestamp
          BEFORE UPDATE ON notification_preferences
          FOR EACH ROW
          EXECUTE FUNCTION handle_preference_update();
    END IF;
END $$;

-- Insert default preferences for existing users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Also create user_push_tokens table for mobile notifications
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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_push_tokens'
        AND policyname = 'users_can_manage_push_tokens'
    ) THEN
        ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "users_can_manage_push_tokens" ON user_push_tokens
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
