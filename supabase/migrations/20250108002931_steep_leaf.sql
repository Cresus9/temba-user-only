/*
  # Add Realtime Chat Features

  1. Tables
    - Event Messages: Store chat messages
    - Event Participants: Track active participants
    - Typing Status: Handle typing indicators

  2. Indexes & Constraints
    - Add performance indexes
    - Add message length constraints
    - Add cleanup triggers for typing status

  3. Security
    - Enable RLS
    - Add appropriate policies
*/

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "view_messages" ON event_messages;
DROP POLICY IF EXISTS "send_messages" ON event_messages;
DROP POLICY IF EXISTS "view_participants" ON event_participants;
DROP POLICY IF EXISTS "join_events" ON event_participants;
DROP POLICY IF EXISTS "leave_events" ON event_participants;
DROP POLICY IF EXISTS "view_typing" ON event_participants;
DROP POLICY IF EXISTS "update_typing" ON event_participants;

-- Add text search capabilities for messages
ALTER TABLE event_messages ADD COLUMN IF NOT EXISTS message_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', message)) STORED;

CREATE INDEX IF NOT EXISTS event_messages_search_idx ON event_messages USING GiST (message_search);

-- Add function to track user presence
CREATE OR REPLACE FUNCTION handle_user_presence() 
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET 
    is_online = CASE 
      WHEN TG_OP = 'INSERT' THEN true
      WHEN TG_OP = 'DELETE' THEN false
      ELSE is_online
    END,
    last_seen = now()
  WHERE user_id = CASE 
    WHEN TG_OP = 'INSERT' THEN NEW.user_id
    WHEN TG_OP = 'DELETE' THEN OLD.user_id
  END;
  
  RETURN CASE 
    WHEN TG_OP = 'INSERT' THEN NEW
    WHEN TG_OP = 'DELETE' THEN OLD
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create presence triggers
CREATE TRIGGER on_participant_join
  AFTER INSERT ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_presence();

CREATE TRIGGER on_participant_leave
  AFTER DELETE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_presence();

-- Create policies for chat and presence
CREATE POLICY "read_messages"
  ON event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND (events.status = 'PUBLISHED' OR auth.uid() IN (
        SELECT user_id FROM profiles WHERE role = 'ADMIN'
      ))
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

CREATE POLICY "read_participants"
  ON event_participants FOR SELECT
  USING (true);

CREATE POLICY "manage_participation"
  ON event_participants FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read_typing_status"
  ON typing_status FOR SELECT
  USING (true);

CREATE POLICY "manage_typing_status"
  ON typing_status FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add function to clean up old messages
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Archive messages older than 30 days
  WITH archived_messages AS (
    DELETE FROM event_messages
    WHERE created_at < now() - INTERVAL '30 days'
    RETURNING *
  )
  INSERT INTO event_messages_archive
  SELECT * FROM archived_messages;
END;
$$;

-- Create archive table for old messages
CREATE TABLE IF NOT EXISTS event_messages_archive (
  LIKE event_messages INCLUDING ALL
);

-- Add indexes for archive table
CREATE INDEX IF NOT EXISTS archived_messages_event_id_idx ON event_messages_archive(event_id);
CREATE INDEX IF NOT EXISTS archived_messages_created_at_idx ON event_messages_archive(created_at);