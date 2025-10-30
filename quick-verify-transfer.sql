-- =====================================================
-- QUICK TICKET TRANSFER VERIFICATION
-- =====================================================
-- Run these queries one by one to quickly verify transfer ownership

-- Step 1: Check if there are any ticket transfers
-- =====================================================
SELECT 
    'Step 1: Transfer Records' as step,
    COUNT(*) as total_transfers,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending
FROM ticket_transfers;

-- Step 2: Check current ticket ownership
-- =====================================================
SELECT 
    'Step 2: Current Ticket Owners' as step,
    t.id as ticket_id,
    t.user_id as owner_id,
    p.name as owner_name,
    p.email as owner_email,
    t.status as ticket_status
FROM tickets t
LEFT JOIN profiles p ON p.user_id = t.user_id
ORDER BY t.created_at DESC
LIMIT 5;

-- Step 3: Check if ownership matches latest transfer
-- =====================================================
SELECT 
    'Step 3: Ownership vs Transfer' as step,
    t.id as ticket_id,
    t.user_id as current_owner,
    tt.recipient_id as transfer_recipient,
    CASE 
        WHEN t.user_id = tt.recipient_id THEN '✅ CORRECT'
        WHEN t.user_id = tt.sender_id AND tt.status = 'PENDING' THEN '⏳ PENDING'
        ELSE '❌ MISMATCH'
    END as status
FROM tickets t
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        sender_id, 
        status
    FROM ticket_transfers 
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
WHERE tt.ticket_id IS NOT NULL
LIMIT 10;

-- Step 4: Check for any orphaned tickets
-- =====================================================
SELECT 
    'Step 4: Orphaned Tickets' as step,
    COUNT(*) as orphaned_count
FROM tickets t
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        status
    FROM ticket_transfers 
    WHERE status = 'COMPLETED'
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
WHERE tt.ticket_id IS NOT NULL 
  AND t.user_id != tt.recipient_id
  AND tt.status = 'COMPLETED';

-- Step 5: Check trigger function exists
-- =====================================================
SELECT 
    'Step 5: Trigger Function' as step,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_proc 
WHERE proname = 'assign_pending_transfers';
