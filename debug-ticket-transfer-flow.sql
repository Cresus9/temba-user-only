-- =====================================================
-- DEBUG TICKET TRANSFER FLOW
-- =====================================================

-- Step 1: Check all ticket transfers
-- =====================================================
SELECT 
    'ALL TICKET TRANSFERS' as info,
    id,
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    recipient_phone,
    status,
    created_at
FROM ticket_transfers 
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check recent tickets
-- =====================================================
SELECT 
    'RECENT TICKETS' as info,
    id,
    user_id,
    event_id,
    ticket_type_id,
    status,
    created_at
FROM tickets 
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check for pending transfers by email
-- =====================================================
SELECT 
    'PENDING TRANSFERS BY EMAIL' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.recipient_email,
    tt.recipient_phone,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status,
    t.created_at as ticket_created
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
WHERE tt.status = 'PENDING'
ORDER BY tt.created_at DESC;

-- Step 4: Check for completed transfers
-- =====================================================
SELECT 
    'COMPLETED TRANSFERS' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.recipient_email,
    tt.recipient_id,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.user_id as current_ticket_owner,
    t.status as ticket_status
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
WHERE tt.status = 'COMPLETED'
ORDER BY tt.created_at DESC;

-- Step 5: Check for orphaned tickets (transferred but ownership not updated)
-- =====================================================
SELECT 
    'ORPHANED TICKETS CHECK' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.recipient_email,
    tt.recipient_id,
    tt.sender_id,
    tt.status as transfer_status,
    t.user_id as current_ticket_owner,
    CASE 
        WHEN t.user_id = tt.sender_id THEN 'Still owned by sender'
        WHEN t.user_id = tt.recipient_id THEN 'Correctly transferred'
        WHEN t.user_id IS NULL THEN 'No owner'
        ELSE 'Owned by someone else'
    END as ownership_status
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
WHERE tt.status = 'COMPLETED'
ORDER BY tt.created_at DESC;

-- Step 6: Check user profiles
-- =====================================================
SELECT 
    'USER PROFILES' as info,
    user_id,
    name,
    email,
    phone,
    created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;
