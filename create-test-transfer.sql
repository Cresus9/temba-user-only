-- =====================================================
-- CREATE TEST TRANSFER
-- =====================================================

-- First, let's find a ticket that can be transferred
-- (owned by a different user than yabresi@gmail.com)
SELECT 
    'AVAILABLE TICKETS FOR TEST TRANSFER' as info,
    t.id as ticket_id,
    t.user_id as owner_id,
    p.email as owner_email,
    t.status as ticket_status,
    e.title as event_title
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE t.status = 'VALID'
  AND p.email != 'yabresi@gmail.com'
ORDER BY t.created_at DESC
LIMIT 5;

-- If we find a ticket, we can create a test transfer
-- (This will be done manually after we see the results)
