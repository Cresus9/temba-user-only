-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with ORGANIZER role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('USER', 'ADMIN', 'ORGANIZER'));

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
GROUP BY e.id, e.title, e.date
ORDER BY e.date DESC;

-- Create policy for organizer access
CREATE POLICY "organizers_can_view_own_events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ORGANIZER'
    )
  );

-- Grant access to view
GRANT SELECT ON organizer_event_analytics TO authenticated;