-- =====================================================
-- CREATE SIMPLE TEST TRANSFER
-- =====================================================

-- First, let's see what users we have
SELECT 
    'AVAILABLE USERS' as info,
    user_id,
    name,
    email
FROM profiles 
ORDER BY created_at DESC;

-- Let's create a simple test transfer
-- We'll transfer yabresi's own ticket to herself (just for testing)
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
    (SELECT user_id FROM profiles WHERE email = 'yabresi@gmail.com'), -- yabresi as recipient
    'yabresi@gmail.com',
    'Yabresi Test',
    'Test self-transfer to verify system works',
    'COMPLETED'
) RETURNING *;

-- Check if the transfer was created
SELECT 
    'CREATED TRANSFER' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created
FROM ticket_transfers tt
WHERE tt.ticket_id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b'
ORDER BY tt.created_at DESC;
