/*
  # Realtime Tables for Chat and Notifications

  1. New Tables
    - event_messages: Stores chat messages for events
    - event_participants: Tracks active participants in event chats
    - typing_status: Tracks users currently typing in chats

  2. Security
    - Enable RLS on all tables
    - Add policies for read/write access
*/

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

-- Event Messages Policies
CREATE POLICY "Anyone can view messages for published events"
  ON event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON event_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

-- Event Participants Policies
CREATE POLICY "Anyone can view event participants"
  ON event_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join events"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events"
  ON event_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Typing Status Policies
CREATE POLICY "Anyone can view typing status"
  ON typing_status FOR SELECT
  USING (true);

CREATE POLICY "Users can update own typing status"
  ON typing_status FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS event_messages_event_id_idx ON event_messages(event_id);
CREATE INDEX IF NOT EXISTS event_messages_created_at_idx ON event_messages(created_at);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS typing_status_event_id_idx ON typing_status(event_id);

-- Function to clean up old typing status
CREATE OR REPLACE FUNCTION cleanup_typing_status() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM typing_status
  WHERE updated_at < now() - INTERVAL '10 seconds';
END;
$$;

-- Create a trigger to automatically clean up old typing status
CREATE OR REPLACE FUNCTION trigger_cleanup_typing_status() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at < now() - INTERVAL '10 seconds' THEN
    DELETE FROM typing_status WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_old_typing_status
  AFTER UPDATE ON typing_status
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_typing_status();