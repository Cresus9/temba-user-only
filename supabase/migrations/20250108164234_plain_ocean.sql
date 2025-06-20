-- Fix admin access policies
CREATE OR REPLACE FUNCTION is_admin(user_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = user_uid
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update events policies
DROP POLICY IF EXISTS "Enable write access for admins" ON events;
CREATE POLICY "Enable write access for admins"
  ON events FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Update ticket types policies
DROP POLICY IF EXISTS "Enable write access for admins" ON ticket_types;
CREATE POLICY "Enable write access for admins"
  ON ticket_types FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id);