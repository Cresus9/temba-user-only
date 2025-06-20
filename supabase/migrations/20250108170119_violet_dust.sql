-- Drop all existing policies for events
DROP POLICY IF EXISTS "Enable write access for admins" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Public can view published events" ON events;
DROP POLICY IF EXISTS "Admins can manage events" ON events;

-- Create new policies for events
CREATE POLICY "events_public_view"
  ON events FOR SELECT
  USING (status = 'PUBLISHED' OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));

CREATE POLICY "events_admin_manage"
  ON events FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);