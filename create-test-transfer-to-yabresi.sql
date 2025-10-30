-- =====================================================
-- CREATE TEST TRANSFER TO yabresi@gmail.com
-- =====================================================

-- First, let's find a ticket owned by someone else to transfer to yabresi@gmail.com
-- Let's find a ticket owned by iyewa@gmail.com
SELECT 
    'TICKETS OWNED BY iyewa@gmail.com' as info,
    t.id as ticket_id,
    t.user_id,
    p.email as owner_email,
    t.status as ticket_status,
    e.title as event_title
FROM tickets t
JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE p.email = 'iyewa@gmail.com'
  AND t.status = 'VALID'
LIMIT 1;

-- Get user IDs
SELECT 
    'USER IDS' as info,
    'iyewa@gmail.com' as email,
    user_id
FROM profiles 
WHERE email = 'iyewa@gmail.com'
UNION ALL
SELECT 
    'USER IDS' as info,
    'yabresi@gmail.com' as email,
    user_id
FROM profiles 
WHERE email = 'yabresi@gmail.com';

-- Create a test transfer (replace ticket_id with actual ticket from above query)
-- This is just for testing - we'll create it manually
INSERT INTO ticket_transfers (
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    recipient_name,
    message,
    status
) VALUES (
    '7e83ed03-4f50-4ebe-918c-f835402bcd7b', -- This is yabresi's ticket, let's find another one
    (SELECT user_id FROM profiles WHERE email = 'iyewa@gmail.com'),
    (SELECT user_id FROM profiles WHERE email = 'yabresi@gmail.com'),
    'yabresi@gmail.com',
    'Yabresi Test',
    'Test transfer to yabresi@gmail.com',
    'COMPLETED'
) RETURNING *;
