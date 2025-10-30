-- =====================================================
-- DEBUG TRANSFER QUERY
-- =====================================================

-- Check if the transfer exists
SELECT 
    'TRANSFER EXISTS CHECK' as info,
    id,
    ticket_id,
    sender_id,
    recipient_email,
    status,
    created_at
FROM ticket_transfers 
WHERE id = '4074de0b-84af-45c3-8415-a1fe36c9e084';

-- Check all pending transfers
SELECT 
    'ALL PENDING TRANSFERS' as info,
    id,
    ticket_id,
    sender_id,
    recipient_email,
    status,
    created_at
FROM ticket_transfers 
WHERE status = 'PENDING'
ORDER BY created_at DESC;

-- Check specifically for yabresi@gmail.com
SELECT 
    'PENDING FOR yabresi@gmail.com' as info,
    id,
    ticket_id,
    sender_id,
    recipient_email,
    status,
    created_at
FROM ticket_transfers 
WHERE status = 'PENDING' 
  AND recipient_email = 'yabresi@gmail.com';

-- Test the exact query that AuthContext uses
SELECT 
    'AUTHCONTEXT QUERY TEST' as info,
    id,
    ticket_id,
    sender_id,
    recipient_email,
    recipient_phone,
    recipient_name,
    message,
    status,
    created_at
FROM ticket_transfers
WHERE status = 'PENDING'
  AND (recipient_email = 'yabresi@gmail.com' OR recipient_phone IS NULL);
