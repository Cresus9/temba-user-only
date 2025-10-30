-- =====================================================
-- DEBUG RECEIVED TICKETS
-- =====================================================

-- Check if there are any completed transfers for yabresi@gmail.com
SELECT 
    'COMPLETED TRANSFERS FOR yabresi@gmail.com' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    e.title as event_title
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tt.status = 'COMPLETED'
  AND tt.recipient_email = 'yabresi@gmail.com'
ORDER BY tt.created_at DESC;

-- Check all completed transfers
SELECT 
    'ALL COMPLETED TRANSFERS' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    e.title as event_title
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tt.status = 'COMPLETED'
ORDER BY tt.created_at DESC;

-- Check tickets owned by yabresi@gmail.com
SELECT 
    'TICKETS OWNED BY yabresi@gmail.com' as info,
    t.id as ticket_id,
    t.user_id,
    p.email as owner_email,
    t.status as ticket_status,
    t.created_at as ticket_created,
    e.title as event_title
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE p.email = 'yabresi@gmail.com'
ORDER BY t.created_at DESC;
