-- Add organizer_id field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Enable write access for admins" ON events;

CREATE POLICY "events_read_policy"
  ON events FOR SELECT
  USING (
    status = 'PUBLISHED' OR
    auth.uid() = organizer_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "events_write_policy"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create view for organizer analytics
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
WHERE e.organizer_id = auth.uid()
GROUP BY e.id, e.title, e.date
ORDER BY e.date DESC;

-- Grant access to view
GRANT SELECT ON organizer_event_analytics TO authenticated;