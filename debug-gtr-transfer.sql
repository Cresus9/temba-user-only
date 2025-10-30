-- =====================================================
-- DEBUG TRANSFER TO gtr@gmail.com
-- =====================================================

-- Check if gtr@gmail.com exists
SELECT 
    'GTR PROFILE CHECK' as info,
    user_id,
    name,
    email,
    phone
FROM profiles 
WHERE email = 'gtr@gmail.com';

-- Check transfers to gtr@gmail.com
SELECT 
    'TRANSFERS TO gtr@gmail.com' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    p_sender.name as sender_name,
    p_sender.email as sender_email
FROM ticket_transfers tt
LEFT JOIN profiles p_sender ON p_sender.user_id = tt.sender_id
WHERE tt.recipient_email = 'gtr@gmail.com'
ORDER BY tt.created_at DESC;

-- Check all pending transfers
SELECT 
    'ALL PENDING TRANSFERS' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    p_sender.name as sender_name,
    p_sender.email as sender_email
FROM ticket_transfers tt
LEFT JOIN profiles p_sender ON p_sender.user_id = tt.sender_id
WHERE tt.status = 'PENDING'
ORDER BY tt.created_at DESC;

-- Check recent transfers (last 10)
SELECT 
    'RECENT TRANSFERS' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    p_sender.name as sender_name,
    p_sender.email as sender_email
FROM ticket_transfers tt
LEFT JOIN profiles p_sender ON p_sender.user_id = tt.sender_id
ORDER BY tt.created_at DESC
LIMIT 10;
