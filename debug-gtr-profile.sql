-- =====================================================
-- DEBUG GTR PROFILE
-- =====================================================

-- Check if gtr@gmail.com exists in profiles
SELECT 
    'GTR PROFILE CHECK' as info,
    user_id,
    name,
    email,
    phone,
    created_at
FROM profiles 
WHERE email = 'gtr@gmail.com';

-- Check if gtr@gmail.com exists in auth.users
SELECT 
    'GTR AUTH CHECK' as info,
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'gtr@gmail.com';

-- Check the specific pending transfer for gtr@gmail.com
SELECT 
    'GTR PENDING TRANSFER' as info,
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
  AND tt.status = 'PENDING';
