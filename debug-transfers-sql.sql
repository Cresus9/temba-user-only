-- =====================================================
-- DEBUG TRANSFERS - SQL VERSION
-- =====================================================

-- Get user ID for yabresi@gmail.com
SELECT 
    'USER PROFILE FOR yabresi@gmail.com' as info,
    user_id,
    name,
    email
FROM profiles 
WHERE email = 'yabresi@gmail.com';

-- Check transfers where yabresi@gmail.com is the recipient
SELECT 
    'TRANSFERS TO yabresi@gmail.com' as info,
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
WHERE tt.recipient_id = (SELECT user_id FROM profiles WHERE email = 'yabresi@gmail.com')
ORDER BY tt.created_at DESC;

-- Check transfers where yabresi@gmail.com is the sender
SELECT 
    'TRANSFERS FROM yabresi@gmail.com' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    p_recipient.name as recipient_name,
    p_recipient.email as recipient_email
FROM ticket_transfers tt
LEFT JOIN profiles p_recipient ON p_recipient.user_id = tt.recipient_id
WHERE tt.sender_id = (SELECT user_id FROM profiles WHERE email = 'yabresi@gmail.com')
ORDER BY tt.created_at DESC;

-- Check ALL transfers in the system
SELECT 
    'ALL TRANSFERS IN SYSTEM' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    p_sender.name as sender_name,
    p_sender.email as sender_email,
    p_recipient.name as recipient_name,
    p_recipient.email as recipient_email
FROM ticket_transfers tt
LEFT JOIN profiles p_sender ON p_sender.user_id = tt.sender_id
LEFT JOIN profiles p_recipient ON p_recipient.user_id = tt.recipient_id
ORDER BY tt.created_at DESC;

-- Check the specific ticket mentioned
SELECT 
    'SPECIFIC TICKET 7e83ed03-4f50-4ebe-918c-f835402bcd7b' as info,
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
