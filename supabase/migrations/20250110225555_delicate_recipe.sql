-- Drop existing notification preferences table and related objects
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
DROP FUNCTION IF EXISTS create_default_notification_preferences();

-- Create notification preferences table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  email boolean DEFAULT true,
  push boolean DEFAULT false,
  types text[] DEFAULT ARRAY['EVENT_REMINDER', 'TICKET_PURCHASED', 'PRICE_CHANGE', 'EVENT_CANCELLED', 'EVENT_UPDATED'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
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
CREATE INDEX idx_notification_preferences_user_id 
  ON notification_preferences(user_id);

-- Create function to handle new users
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

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_preferences();

-- Create function to handle preference updates
CREATE OR REPLACE FUNCTION handle_preference_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for preference updates
CREATE TRIGGER update_preferences_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_preference_update();

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;