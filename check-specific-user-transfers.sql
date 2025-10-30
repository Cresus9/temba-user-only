-- =====================================================
-- CHECK SPECIFIC USER TRANSFERS
-- =====================================================

-- Check for pending transfers for the most recent user (yabresi@gmail.com)
SELECT 
    'PENDING TRANSFERS FOR yabresi@gmail.com' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.recipient_phone,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    e.title as event_title
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tt.recipient_email = 'yabresi@gmail.com'
ORDER BY tt.created_at DESC;

-- Check for pending transfers for iyewa@gmail.com
SELECT 
    'PENDING TRANSFERS FOR iyewa@gmail.com' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.recipient_phone,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    e.title as event_title
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tt.recipient_email = 'iyewa@gmail.com'
ORDER BY tt.created_at DESC;

-- Check for pending transfers for ffff@gmail.com
SELECT 
    'PENDING TRANSFERS FOR ffff@gmail.com' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.recipient_phone,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    e.title as event_title
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tt.recipient_email = 'ffff@gmail.com'
ORDER BY tt.created_at DESC;

-- Check ALL pending transfers
SELECT 
    'ALL PENDING TRANSFERS' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.recipient_phone,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    e.title as event_title
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tt.status = 'PENDING'
ORDER BY tt.created_at DESC;

-- Check tickets owned by these users
SELECT 
    'TICKETS OWNED BY USERS' as info,
    t.id as ticket_id,
    t.user_id,
    p.email as owner_email,
    t.status as ticket_status,
    t.created_at as ticket_created,
    e.title as event_title
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE p.email IN ('yabresi@gmail.com', 'iyewa@gmail.com', 'ffff@gmail.com', 'yabregui@gmail.com')
ORDER BY t.created_at DESC;
