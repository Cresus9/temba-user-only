-- =====================================================
-- DEBUG TRANSFER FROM yabresi@gmail.com TO hermanyabre5@gmail.com
-- =====================================================

-- Check if the transfer was created
SELECT 
    'TRANSFER RECORD' as info,
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
WHERE tt.ticket_id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b'
ORDER BY tt.created_at DESC;

-- Check current ticket ownership
SELECT 
    'CURRENT TICKET OWNERSHIP' as info,
    t.id as ticket_id,
    t.user_id as current_owner_id,
    p_owner.name as current_owner_name,
    p_owner.email as current_owner_email,
    t.status as ticket_status
FROM tickets t
LEFT JOIN profiles p_owner ON p_owner.user_id = t.user_id
WHERE t.id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';

-- Check if hermanyabre5@gmail.com exists
SELECT 
    'HERMANYABRE5 PROFILE' as info,
    user_id,
    name,
    email
FROM profiles 
WHERE email = 'hermanyabre5@gmail.com';

-- Check all transfers in the system
SELECT 
    'ALL TRANSFERS' as info,
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
