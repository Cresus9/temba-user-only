-- =====================================================
-- FREE TICKET DIAGNOSTIC QUERIES
-- Run these ONE AT A TIME in Supabase SQL Editor
-- =====================================================

-- Query 1: Find COMPLETED orders with NO tickets (this is the bug!)
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

-- Query 2: Check for free ticket orders (any payment method with FREE or total = 0)
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

-- Query 3: Check tickets that might be free tickets (no order or order with 0 total)
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

-- Query 4: Check specific order for tickets (replace ORDER_ID with actual order ID)
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

-- Query 5: Check all tickets for a specific user (replace USER_ID with actual user ID)
SELECT 
  t.id as ticket_id,
  t.status,
  t.scanned_at,
  t.created_at,
  o.payment_method,
  o.total,
  e.title as event_title,
  e.status as event_status,
  p.email as user_email
FROM tickets t
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN profiles p ON t.user_id = p.user_id
WHERE t.user_id = '2b408add-6042-4a31-bed7-dcf4e7438b7a'
ORDER BY t.created_at DESC;

