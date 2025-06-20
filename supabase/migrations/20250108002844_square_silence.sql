/*
  # Add Realtime Features

  1. Tables
    - Event Messages: For chat functionality
    - Event Participants: Track who's in an event
    - Typing Status: Show typing indicators

  2. Policies
    - Enable RLS for all tables
    - Set up appropriate access policies
    - Add indexes for performance

  3. Constraints
    - Message length limits
    - Automatic cleanup of old typing status
*/

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view messages for published events" ON event_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON event_messages;
DROP POLICY IF EXISTS "Anyone can view event participants" ON event_participants;
DROP POLICY IF EXISTS "Users can join events" ON event_participants;
DROP POLICY IF EXISTS "Users can leave events" ON event_participants;
DROP POLICY IF EXISTS "Anyone can view typing status" ON typing_status;
DROP POLICY IF EXISTS "Users can update own typing status" ON typing_status;

-- Event Messages Table
CREATE TABLE IF NOT EXISTS event_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Event Participants Table
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Typing Status Table
CREATE TABLE IF NOT EXISTS typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Add message length constraint
ALTER TABLE event_messages
  ADD CONSTRAINT message_length_check
  CHECK (char_length(message) BETWEEN 1 AND 1000);

-- Create new policies
CREATE POLICY "view_messages"
  ON event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "send_messages"
  ON event_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "view_participants"
  ON event_participants FOR SELECT
  USING (true);

CREATE POLICY "join_events"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leave_events"
  ON event_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "view_typing"
  ON typing_status FOR SELECT
  USING (true);

CREATE POLICY "update_typing"
  ON typing_status FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS event_messages_user_id_idx ON event_messages(user_id);
CREATE INDEX IF NOT EXISTS event_messages_event_user_idx ON event_messages(event_id, user_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS event_participants_joined_idx ON event_participants(joined_at);
CREATE INDEX IF NOT EXISTS typing_status_updated_idx ON typing_status(updated_at);

-- Function to automatically remove old typing status
CREATE OR REPLACE FUNCTION cleanup_old_typing_status() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM typing_status
  WHERE updated_at < now() - INTERVAL '10 seconds';
  RETURN NULL;
END;
$$;

-- Create trigger to periodically clean up old typing status
CREATE TRIGGER cleanup_typing_status_trigger
  AFTER INSERT OR UPDATE ON typing_status
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_typing_status();