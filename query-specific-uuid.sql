-- =====================================================
-- INVESTIGATE SPECIFIC UUID: 3df844a0-f8c9-4acb-a8ed-8e6b3e9d5fa9
-- =====================================================

-- Check if it's an ORDER
SELECT 
  'ORDER' as type,
  o.id,
  o.user_id,
  o.status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  p.email as user_email,
  COUNT(t.id) as tickets_created
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN profiles p ON o.user_id = p.user_id
LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.id = '3df844a0-f8c9-4acb-a8ed-8e6b3e9d5fa9'
GROUP BY o.id, o.user_id, o.status, o.payment_method, o.total, o.ticket_quantities, o.created_at, e.title, p.email;

-- Check if it's a TICKET
SELECT 
  'TICKET' as type,
  t.id,
  t.user_id,
  t.status,
  t.scanned_at,
  t.created_at,
  t.order_id,
  o.payment_method,
  o.total as order_total,
  o.status as order_status,
  e.title as event_title,
  e.status as event_status,
  p.email as user_email
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN profiles p ON t.user_id = p.user_id
WHERE t.id = '3df844a0-f8c9-4acb-a8ed-8e6b3e9d5fa9';

-- Check if it's a USER_ID - find all their orders and tickets
SELECT 
  'USER_ORDERS' as type,
  o.id as order_id,
  o.status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  COUNT(t.id) as tickets_created
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.user_id = '3df844a0-f8c9-4acb-a8ed-8e6b3e9d5fa9'
GROUP BY o.id, o.status, o.payment_method, o.total, o.ticket_quantities, o.created_at, e.title
ORDER BY o.created_at DESC;

-- Check if it's a USER_ID - find all their tickets
SELECT 
  'USER_TICKETS' as type,
  t.id as ticket_id,
  t.status,
  t.scanned_at,
  t.created_at,
  t.order_id,
  o.payment_method,
  o.total as order_total,
  e.title as event_title,
  e.status as event_status
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id
WHERE t.user_id = '3df844a0-f8c9-4acb-a8ed-8e6b3e9d5fa9'
ORDER BY t.created_at DESC;

-- Check if it's an EVENT_ID
SELECT 
  'EVENT' as type,
  e.id,
  e.title,
  e.status,
  e.date,
  COUNT(DISTINCT o.id) as order_count,
  COUNT(DISTINCT t.id) as ticket_count
FROM events e
LEFT JOIN orders o ON o.event_id = e.id
LEFT JOIN tickets t ON t.event_id = e.id
WHERE e.id = '3df844a0-f8c9-4acb-a8ed-8e6b3e9d5fa9'
GROUP BY e.id, e.title, e.status, e.date;

