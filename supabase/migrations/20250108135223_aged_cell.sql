-- Enable RLS on event_messages_archive table
ALTER TABLE event_messages_archive ENABLE ROW LEVEL SECURITY;

-- Create policies for event_messages_archive
CREATE POLICY "Enable read for admins"
  ON event_messages_archive FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Enable write for system"
  ON event_messages_archive FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );