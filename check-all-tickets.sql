-- =====================================================
-- CHECK ALL TICKETS AND OWNERS
-- =====================================================

-- Get all tickets with their owners
SELECT 
    'ALL TICKETS' as info,
    t.id as ticket_id,
    t.user_id as owner_id,
    p.name as owner_name,
    p.email as owner_email,
    t.status as ticket_status,
    t.created_at as ticket_created,
    e.title as event_title
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
ORDER BY t.created_at DESC;

-- Count tickets by owner
SELECT 
    'TICKET COUNT BY OWNER' as info,
    p.name as owner_name,
    p.email as owner_email,
    COUNT(*) as ticket_count
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
GROUP BY p.user_id, p.name, p.email
ORDER BY ticket_count DESC;
