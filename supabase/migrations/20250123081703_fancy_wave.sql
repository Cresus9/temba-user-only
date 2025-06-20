-- Drop existing view if it exists
DROP VIEW IF EXISTS support_ticket_details;

-- Create improved view for support ticket details
CREATE OR REPLACE VIEW support_ticket_details AS
SELECT 
  st.id,
  st.subject,
  st.status,
  st.priority,
  st.created_at,
  st.category_id,
  st.user_id,
  p.name as user_name,
  p.email as user_email,
  sc.name as category_name,
  (
    SELECT COUNT(*) 
    FROM support_messages sm 
    WHERE sm.ticket_id = st.id
  ) as message_count,
  GREATEST(
    st.created_at,
    COALESCE(st.last_reply_at, st.created_at),
    COALESCE(
      (SELECT MAX(created_at) FROM support_messages WHERE ticket_id = st.id),
      st.created_at
    )
  ) as latest_activity
FROM support_tickets st
LEFT JOIN profiles p ON p.user_id = st.user_id
LEFT JOIN support_categories sc ON sc.id = st.category_id;

-- Create index to improve view performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_latest_activity 
ON support_tickets(last_reply_at);