-- =====================================================
-- CHECK ALL TRANSFERS IN SYSTEM
-- =====================================================

-- Check if ticket_transfers table has any data at all
SELECT 
    'TOTAL TRANSFERS' as info,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count
FROM ticket_transfers;

-- Show all transfers (if any exist)
SELECT 
    'ALL TRANSFERS' as info,
    id,
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    recipient_phone,
    status,
    created_at
FROM ticket_transfers 
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are any tickets that could be transferred
SELECT 
    'AVAILABLE TICKETS FOR TRANSFER' as info,
    t.id as ticket_id,
    t.user_id as owner_id,
    p.email as owner_email,
    t.status as ticket_status,
    e.title as event_title,
    t.created_at as ticket_created
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE t.status = 'VALID'
ORDER BY t.created_at DESC
LIMIT 10;
