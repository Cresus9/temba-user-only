-- =====================================================
-- TICKET DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to check tickets
-- =====================================================

-- 1. Check all orders (especially free ticket orders)
SELECT 
  o.id as order_id,
  o.user_id,
  o.event_id,
  o.status as order_status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  e.status as event_status,
  p.email as user_email,
  p.name as user_name
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN profiles p ON o.user_id = p.user_id
ORDER BY o.created_at DESC
LIMIT 50;

-- 2. Check for free ticket orders specifically
SELECT 
  o.id as order_id,
  o.user_id,
  o.status as order_status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  e.status as event_status,
  p.email as user_email
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN profiles p ON o.user_id = p.user_id
WHERE 
  o.payment_method ILIKE '%FREE%' 
  OR o.total = 0 
  OR o.total IS NULL
ORDER BY o.created_at DESC;

-- 3. Check all tickets with their order and event info
SELECT 
  t.id as ticket_id,
  t.qr_code,
  t.status as ticket_status,
  t.scanned_at,
  t.created_at as ticket_created_at,
  t.user_id,
  t.event_id,
  t.ticket_type_id,
  t.order_id,
  o.status as order_status,
  o.payment_method,
  o.total as order_total,
  e.title as event_title,
  e.status as event_status,
  tt.name as ticket_type_name,
  p.email as user_email,
  p.name as user_name
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
LEFT JOIN profiles p ON t.user_id = p.user_id
ORDER BY t.created_at DESC
LIMIT 50;

-- 4. Check tickets for free ticket orders
SELECT 
  t.id as ticket_id,
  t.qr_code,
  t.status as ticket_status,
  t.scanned_at,
  t.user_id,
  t.order_id,
  o.payment_method,
  o.total as order_total,
  e.title as event_title,
  e.status as event_status,
  p.email as user_email
FROM tickets t
INNER JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN profiles p ON t.user_id = p.user_id
WHERE 
  (o.payment_method ILIKE '%FREE%' 
   OR o.total = 0 
   OR o.total IS NULL)
  AND t.status = 'VALID'
  AND t.scanned_at IS NULL
ORDER BY t.created_at DESC;

-- 5. Count tickets by status and order type
SELECT 
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN t.status = 'VALID' THEN 1 END) as valid_tickets,
  COUNT(CASE WHEN t.scanned_at IS NULL THEN 1 END) as unscanned_tickets,
  COUNT(CASE WHEN o.payment_method ILIKE '%FREE%' OR o.total = 0 THEN 1 END) as free_tickets,
  COUNT(CASE WHEN e.status = 'PUBLISHED' THEN 1 END) as published_event_tickets
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id;

-- 6. Check if tickets exist for a specific user (replace USER_ID_HERE)
-- SELECT 
--   t.id as ticket_id,
--   t.status,
--   t.scanned_at,
--   o.payment_method,
--   o.total,
--   e.title as event_title,
--   e.status as event_status,
--   p.email as user_email
-- FROM tickets t
-- LEFT JOIN orders o ON t.order_id = o.id
-- LEFT JOIN events e ON t.event_id = e.id
-- LEFT JOIN profiles p ON t.user_id = p.user_id
-- WHERE t.user_id = 'USER_ID_HERE'
-- ORDER BY t.created_at DESC;

-- 7. Check orders without tickets (potential issue)
SELECT 
  o.id as order_id,
  o.user_id,
  o.status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  COUNT(t.id) as ticket_count
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.status = 'COMPLETED'
GROUP BY o.id, o.user_id, o.status, o.payment_method, o.total, o.ticket_quantities, o.created_at, e.title
HAVING COUNT(t.id) = 0
ORDER BY o.created_at DESC;

-- 8. Check recent orders and their ticket creation status
SELECT 
  o.id as order_id,
  o.user_id,
  o.status as order_status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  COUNT(t.id) as tickets_created,
  jsonb_object_keys(o.ticket_quantities) as ticket_type_ids
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
WHERE o.created_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.user_id, o.status, o.payment_method, o.total, o.ticket_quantities, o.created_at, e.title
ORDER BY o.created_at DESC;

-- 9. Find COMPLETED orders with NO tickets (this is the bug!)
SELECT 
  o.id as order_id,
  o.user_id,
  o.status as order_status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  p.email as user_email,
  COUNT(t.id) as tickets_created
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
LEFT JOIN profiles p ON o.user_id = p.user_id
WHERE o.status = 'COMPLETED'
GROUP BY o.id, o.user_id, o.status, o.payment_method, o.total, o.ticket_quantities, o.created_at, e.title, p.email
HAVING COUNT(t.id) = 0
ORDER BY o.created_at DESC;

-- 10. Check for free ticket orders (any payment method with FREE or total = 0)
SELECT 
  o.id as order_id,
  o.user_id,
  o.status as order_status,
  o.payment_method,
  o.total,
  o.ticket_quantities,
  o.created_at,
  e.title as event_title,
  p.email as user_email,
  COUNT(t.id) as tickets_created
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN tickets t ON t.order_id = o.id
LEFT JOIN profiles p ON o.user_id = p.user_id
WHERE 
  o.payment_method ILIKE '%FREE%' 
  OR o.total = 0 
  OR o.total IS NULL
GROUP BY o.id, o.user_id, o.status, o.payment_method, o.total, o.ticket_quantities, o.created_at, e.title, p.email
ORDER BY o.created_at DESC;

-- 11. Check tickets that might be free tickets (no order or order with 0 total)
SELECT 
  t.id as ticket_id,
  t.user_id,
  t.status as ticket_status,
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
WHERE 
  t.order_id IS NULL
  OR o.total = 0
  OR o.total IS NULL
  OR o.payment_method ILIKE '%FREE%'
ORDER BY t.created_at DESC;

-- 12. Check if tickets exist for a specific completed order (use order ID from query #9)
-- Example: Check order '61b25d89-b0bd-4219-9d67-49b8f4673311'
SELECT 
  t.id as ticket_id,
  t.status,
  t.scanned_at,
  t.created_at,
  t.user_id,
  o.id as order_id,
  o.status as order_status,
  o.payment_method,
  o.total,
  e.title as event_title
FROM tickets t
INNER JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id
WHERE o.id = '61b25d89-b0bd-4219-9d67-49b8f4673311';

-- 13. Check what triggers/functions create tickets - verify ticket creation logic
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

