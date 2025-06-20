-- Drop dependent objects first
DROP VIEW IF EXISTS organizer_event_analytics;
DROP POLICY IF EXISTS "events_read_policy" ON events;
DROP POLICY IF EXISTS "events_write_policy" ON events;

-- Now we can safely modify the events table
ALTER TABLE events DROP COLUMN IF EXISTS organizer_id;

-- Add organizer_id with correct relationship to profiles
ALTER TABLE events 
ADD COLUMN organizer_id uuid REFERENCES profiles(user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

-- Recreate policies
CREATE POLICY "events_read_policy"
  ON events FOR SELECT
  USING (
    status = 'PUBLISHED' OR
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE user_id = organizer_id OR role = 'ADMIN'
    )
  );

CREATE POLICY "events_write_policy"
  ON events FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles
      WHERE user_id = organizer_id OR role = 'ADMIN'
    )
  );

-- Recreate the view with proper joins
CREATE OR REPLACE VIEW organizer_event_analytics AS
SELECT 
  e.id as event_id,
  e.title as event_title,
  e.date as event_date,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(t.id) as tickets_sold,
  COALESCE(SUM(o.total), 0) as total_revenue,
  ARRAY_AGG(DISTINCT tt.name) as ticket_types,
  jsonb_build_object(
    'pending', COUNT(CASE WHEN o.status = 'PENDING' THEN 1 END),
    'completed', COUNT(CASE WHEN o.status = 'COMPLETED' THEN 1 END),
    'cancelled', COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END)
  ) as order_status_counts
FROM events e
LEFT JOIN orders o ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
WHERE e.organizer_id = (
  SELECT user_id FROM profiles WHERE user_id = auth.uid()
)
GROUP BY e.id, e.title, e.date
ORDER BY e.date DESC;

-- Grant access to view
GRANT SELECT ON organizer_event_analytics TO authenticated;