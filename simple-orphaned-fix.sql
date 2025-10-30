-- =====================================================
-- SIMPLE ORPHANED TICKET FIX
-- =====================================================

-- Step 1: Show the exact orphaned ticket
-- =====================================================
SELECT 
    'ORPHANED TICKET DETAILS' as info,
    t.id as ticket_id,
    t.user_id as current_owner,
    p1.name as current_owner_name,
    tt.recipient_id as should_be_owner,
    p2.name as should_be_owner_name,
    tt.status as transfer_status,
    t.scanned_at,
    CASE 
        WHEN t.scanned_at IS NOT NULL THEN 'SCANNED - Cannot transfer'
        ELSE 'Safe to transfer'
    END as safety_status
FROM tickets t
LEFT JOIN profiles p1 ON p1.user_id = t.user_id
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        status
    FROM ticket_transfers 
    WHERE status = 'COMPLETED'
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
LEFT JOIN profiles p2 ON p2.user_id = tt.recipient_id
WHERE tt.ticket_id IS NOT NULL 
  AND t.user_id IS DISTINCT FROM tt.recipient_id
  AND tt.status = 'COMPLETED';

-- Step 2: Force fix it (regardless of scan status)
-- =====================================================
UPDATE tickets 
SET 
    user_id = tt.recipient_id,
    updated_at = NOW()
FROM (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id
    FROM ticket_transfers 
    WHERE status = 'COMPLETED'
    ORDER BY ticket_id, created_at DESC
) tt
WHERE tickets.id = tt.ticket_id
  AND tickets.user_id IS DISTINCT FROM tt.recipient_id;

-- Step 3: Verify fix
-- =====================================================
SELECT 
    'FIX APPLIED' as status,
    'Orphaned ticket ownership updated' as message;

-- Step 4: Final count
-- =====================================================
SELECT 
    'FINAL COUNT' as status,
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
  AND t.user_id IS DISTINCT FROM tt.recipient_id
  AND tt.status = 'COMPLETED';
