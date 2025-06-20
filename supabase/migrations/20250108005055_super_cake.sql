/*
  # Add Real-time Chat and Presence Features

  1. New Tables
    - event_messages: Stores chat messages for events
    - event_participants: Tracks event participation
    - typing_status: Manages typing indicators

  2. Security
    - Enable RLS on all tables
    - Add policies for message visibility and creation
    - Add policies for participant management
    - Add policies for typing status

  3. Performance
    - Add indexes for common queries
    - Add text search for messages
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
CREATE POLICY "event_messages_select"
  ON event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "event_messages_insert"
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
CREATE POLICY "event_participants_select"
  ON event_participants FOR SELECT
  USING (true);

CREATE POLICY "event_participants_insert"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_participants_delete"
  ON event_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Typing Status Policies
CREATE POLICY "typing_status_select"
  ON typing_status FOR SELECT
  USING (true);

CREATE POLICY "typing_status_all"
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

-- Add text search capabilities for messages
ALTER TABLE event_messages ADD COLUMN IF NOT EXISTS message_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', message)) STORED;

CREATE INDEX IF NOT EXISTS event_messages_search_idx ON event_messages USING GiST (message_search);