-- =====================================================
-- CREATE TEST TRANSFER MANUALLY
-- =====================================================

-- First, let's check if hermanyabre5@gmail.com exists
SELECT 
    'CHECK HERMANYABRE5 EXISTS' as info,
    user_id,
    name,
    email
FROM profiles 
WHERE email = 'hermanyabre5@gmail.com';

-- If not, let's see what users we have
SELECT 
    'ALL USERS' as info,
    user_id,
    name,
    email
FROM profiles 
ORDER BY created_at DESC;

-- Create a test transfer manually
-- We'll transfer yabresi's ticket to hermanyabre5@gmail.com
INSERT INTO ticket_transfers (
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    recipient_name,
    message,
    status
) VALUES (
    '7e83ed03-4f50-4ebe-918c-f835402bcd7b', -- yabresi's ticket
    (SELECT user_id FROM profiles WHERE email = 'yabresi@gmail.com'), -- yabresi as sender
    (SELECT user_id FROM profiles WHERE email = 'hermanyabre5@gmail.com'), -- hermanyabre5 as recipient
    'hermanyabre5@gmail.com',
    'Herman Yabre',
    'Test transfer from yabresi to hermanyabre5',
    'COMPLETED'
) RETURNING *;

-- Update ticket ownership
UPDATE tickets 
SET user_id = (SELECT user_id FROM profiles WHERE email = 'hermanyabre5@gmail.com'),
    updated_at = now()
WHERE id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';

-- Check the result
SELECT 
    'FINAL RESULT' as info,
    t.id as ticket_id,
    t.user_id as current_owner_id,
    p_owner.name as current_owner_name,
    p_owner.email as current_owner_email,
    t.status as ticket_status
FROM tickets t
LEFT JOIN profiles p_owner ON p_owner.user_id = t.user_id
WHERE t.id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';