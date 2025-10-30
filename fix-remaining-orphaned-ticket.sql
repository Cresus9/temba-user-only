-- =====================================================
-- FIX REMAINING ORPHANED TICKET
-- =====================================================
-- This script identifies and fixes the remaining orphaned ticket

-- Step 1: Identify the orphaned ticket
-- =====================================================
SELECT 
    'Orphaned Ticket Details' as status,
    t.id as ticket_id,
    t.user_id as current_owner,
    p1.name as current_owner_name,
    p1.email as current_owner_email,
    tt.recipient_id as should_be_owner,
    p2.name as should_be_owner_name,
    p2.email as should_be_owner_email,
    tt.status as transfer_status,
    tt.created_at as transfer_date,
    t.scanned_at,
    CASE 
        WHEN t.scanned_at IS NOT NULL THEN 'ALREADY SCANNED - DO NOT TRANSFER'
        ELSE 'SAFE TO TRANSFER'
    END as transfer_safety
FROM tickets t
LEFT JOIN profiles p1 ON p1.user_id = t.user_id
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
LEFT JOIN profiles p2 ON p2.user_id = tt.recipient_id
WHERE tt.ticket_id IS NOT NULL 
  AND t.user_id IS DISTINCT FROM tt.recipient_id
  AND tt.status = 'COMPLETED';

-- Step 2: Fix the orphaned ticket (only if not scanned)
-- =====================================================
WITH orphaned_tickets AS (
    SELECT 
        t.id as ticket_id,
        tt.recipient_id as correct_owner_id
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
      AND tt.status = 'COMPLETED'
      AND (t.scanned_at IS NULL OR t.scanned_at = 'infinity'::timestamp)
)
UPDATE tickets 
SET 
    user_id = ot.correct_owner_id,
    updated_at = NOW()
FROM orphaned_tickets ot
WHERE tickets.id = ot.ticket_id;

-- Step 3: Verify the fix
-- =====================================================
SELECT 
    'Fix Applied' as status,
    'Updated ticket ownership for unscanned orphaned tickets' as message;

-- Step 4: Final verification
-- =====================================================
SELECT 
    'Final Orphaned Check' as status,
    COUNT(*) as remaining_orphaned_count
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

-- Step 5: Show any remaining issues
-- =====================================================
SELECT 
    'Remaining Issues' as status,
    t.id as ticket_id,
    t.user_id as current_owner,
    tt.recipient_id as should_be_owner,
    CASE 
        WHEN t.scanned_at IS NOT NULL THEN 'SCANNED - Cannot transfer'
        ELSE 'UNKNOWN ISSUE'
    END as issue_type
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
