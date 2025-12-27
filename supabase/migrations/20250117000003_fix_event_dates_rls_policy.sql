/*
  # Fix RLS Policy for event_dates_times
  
  The current policy uses EXISTS subquery which might be too restrictive.
  This creates a more permissive policy that allows public users to view
  active dates for published events.
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active event dates" ON event_dates_times;

-- Create a more permissive policy that works for both authenticated and anonymous users
CREATE POLICY "Anyone can view active event dates"
  ON event_dates_times FOR SELECT
  TO public
  USING (
    status = 'ACTIVE' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_dates_times.event_id
      AND events.status = 'PUBLISHED'
    )
  );

-- Also allow authenticated users to view dates for their own events (even if draft)
CREATE POLICY "Users can view dates for their own events"
  ON event_dates_times FOR SELECT
  TO authenticated
  USING (
    status = 'ACTIVE' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_dates_times.event_id
      AND (
        events.status = 'PUBLISHED' OR
        events.organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('ADMIN', 'ORGANIZER')
        )
      )
    )
  );

