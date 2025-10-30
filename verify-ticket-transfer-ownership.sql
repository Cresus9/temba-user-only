-- =====================================================
-- TICKET TRANSFER OWNERSHIP VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify that ticket transfer ownership is working correctly

-- 1. Check current ticket ownership and transfer records
-- =====================================================
SELECT 
    'CURRENT TICKET OWNERSHIP' as check_type,
    t.id as ticket_id,
    t.user_id as current_owner_id,
    p.name as current_owner_name,
    p.email as current_owner_email,
    t.status as ticket_status,
    t.created_at as ticket_created,
    t.updated_at as ticket_updated
FROM tickets t
LEFT JOIN profiles p ON p.user_id = t.user_id
ORDER BY t.created_at DESC
LIMIT 10;

-- 2. Check all ticket transfers
-- =====================================================
SELECT 
    'TICKET TRANSFERS' as check_type,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    s.name as sender_name,
    s.email as sender_email,
    tt.recipient_id,
    r.name as recipient_name,
    r.email as recipient_email,
    tt.recipient_email as transfer_email,
    tt.recipient_phone as transfer_phone,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    tt.updated_at as transfer_updated
FROM ticket_transfers tt
LEFT JOIN profiles s ON s.user_id = tt.sender_id
LEFT JOIN profiles r ON r.user_id = tt.recipient_id
ORDER BY tt.created_at DESC;

-- 3. Verify ticket ownership matches latest transfer
-- =====================================================
SELECT 
    'OWNERSHIP VERIFICATION' as check_type,
    t.id as ticket_id,
    t.user_id as current_ticket_owner,
    tt.recipient_id as latest_transfer_recipient,
    CASE 
        WHEN t.user_id = tt.recipient_id THEN '✅ CORRECT'
        WHEN t.user_id = tt.sender_id AND tt.status = 'PENDING' THEN '⏳ PENDING TRANSFER'
        WHEN t.user_id = tt.sender_id AND tt.status = 'COMPLETED' THEN '❌ OWNERSHIP NOT UPDATED'
        ELSE '❌ MISMATCH'
    END as ownership_status,
    tt.status as transfer_status,
    tt.created_at as transfer_date
FROM tickets t
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        sender_id, 
        status, 
        created_at
    FROM ticket_transfers 
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
WHERE tt.ticket_id IS NOT NULL
ORDER BY tt.created_at DESC;

-- 4. Check for orphaned tickets (tickets with transfers but wrong ownership)
-- =====================================================
SELECT 
    'ORPHANED TICKETS' as check_type,
    t.id as ticket_id,
    t.user_id as current_owner,
    p.name as current_owner_name,
    tt.recipient_id as should_be_owner,
    r.name as should_be_owner_name,
    tt.status as transfer_status,
    tt.created_at as transfer_date
FROM tickets t
LEFT JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        status, 
        created_at
    FROM ticket_transfers 
    WHERE status = 'COMPLETED'
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
LEFT JOIN profiles r ON r.user_id = tt.recipient_id
WHERE tt.ticket_id IS NOT NULL 
  AND t.user_id != tt.recipient_id
  AND tt.status = 'COMPLETED';

-- 5. Check pending transfers (transfers without recipient_id)
-- =====================================================
SELECT 
    'PENDING TRANSFERS' as check_type,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    s.name as sender_name,
    s.email as sender_email,
    tt.recipient_email,
    tt.recipient_phone,
    tt.recipient_name,
    tt.status,
    tt.created_at
FROM ticket_transfers tt
LEFT JOIN profiles s ON s.user_id = tt.sender_id
WHERE tt.recipient_id IS NULL
ORDER BY tt.created_at DESC;

-- 6. Check transfer statistics
-- =====================================================
SELECT 
    'TRANSFER STATISTICS' as check_type,
    COUNT(*) as total_transfers,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transfers,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_transfers,
    COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_transfers,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_transfers,
    COUNT(CASE WHEN status = 'USED' THEN 1 END) as used_transfers,
    COUNT(CASE WHEN recipient_id IS NULL THEN 1 END) as transfers_to_unregistered_users
FROM ticket_transfers;

-- 7. Check recent transfer activity
-- =====================================================
SELECT 
    'RECENT TRANSFER ACTIVITY' as check_type,
    tt.id as transfer_id,
    tt.ticket_id,
    e.title as event_title,
    tt.sender_id,
    s.name as sender_name,
    tt.recipient_id,
    r.name as recipient_name,
    tt.recipient_email,
    tt.status,
    tt.created_at,
    EXTRACT(EPOCH FROM (NOW() - tt.created_at))/60 as minutes_ago
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
LEFT JOIN profiles s ON s.user_id = tt.sender_id
LEFT JOIN profiles r ON r.user_id = tt.recipient_id
ORDER BY tt.created_at DESC
LIMIT 20;

-- 8. Verify trigger function is working (check if assign_pending_transfers exists)
-- =====================================================
SELECT 
    'TRIGGER FUNCTION CHECK' as check_type,
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'assign_pending_transfers';

-- 9. Check if trigger exists
-- =====================================================
SELECT 
    'TRIGGER CHECK' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'assign_pending_transfers_trigger';

-- 10. Test data for verification (create test transfer if needed)
-- =====================================================
-- Uncomment and run this to create a test transfer for verification
/*
INSERT INTO ticket_transfers (
    ticket_id,
    sender_id,
    recipient_email,
    recipient_name,
    message,
    status
) VALUES (
    (SELECT id FROM tickets LIMIT 1), -- Replace with actual ticket ID
    (SELECT id FROM auth.users LIMIT 1), -- Replace with actual user ID
    'test@example.com',
    'Test Recipient',
    'Test transfer for verification',
    'PENDING'
);
*/

-- =====================================================
-- EXPECTED RESULTS FOR VERIFICATION
-- =====================================================
/*
1. OWNERSHIP VERIFICATION should show:
   - ✅ CORRECT for properly transferred tickets
   - ⏳ PENDING TRANSFER for pending transfers
   - ❌ OWNERSHIP NOT UPDATED should be empty (if working correctly)

2. ORPHANED TICKETS should be empty if ownership is working correctly

3. PENDING TRANSFERS should show transfers waiting for recipient signup

4. TRANSFER STATISTICS should show the distribution of transfer statuses

5. TRIGGER FUNCTION CHECK should show the assign_pending_transfers function exists

6. TRIGGER CHECK should show the trigger is active
*/
