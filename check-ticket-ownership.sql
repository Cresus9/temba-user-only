-- =====================================================
-- CHECK TICKET OWNERSHIP
-- =====================================================

-- Check current ownership of the transferred ticket
SELECT 
    'CURRENT TICKET OWNERSHIP' as info,
    t.id as ticket_id,
    t.user_id as current_owner_id,
    p_owner.name as current_owner_name,
    p_owner.email as current_owner_email,
    t.status as ticket_status,
    e.title as event_title
FROM tickets t
LEFT JOIN profiles p_owner ON p_owner.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE t.id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';

-- Check all tickets owned by hermanyabre5@gmail.com
SELECT 
    'TICKETS OWNED BY HERMANYABRE5' as info,
    t.id as ticket_id,
    t.user_id as owner_id,
    p_owner.name as owner_name,
    p_owner.email as owner_email,
    t.status as ticket_status,
    e.title as event_title
FROM tickets t
LEFT JOIN profiles p_owner ON p_owner.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE p_owner.email = 'hermanyabre5@gmail.com'
ORDER BY t.created_at DESC;
