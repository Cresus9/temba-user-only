-- =====================================================
-- COMPREHENSIVE ORPHANED TICKET DIAGNOSTIC AND FIX
-- =====================================================

-- Step 1: Detailed analysis of the orphaned ticket
-- =====================================================
WITH orphaned_analysis AS (
    SELECT 
        t.id as ticket_id,
        t.user_id as current_owner_id,
        p1.name as current_owner_name,
        p1.email as current_owner_email,
        tt.recipient_id as transfer_recipient_id,
        p2.name as transfer_recipient_name,
        p2.email as transfer_recipient_email,
        tt.status as transfer_status,
        tt.created_at as transfer_created,
        t.scanned_at,
        t.created_at as ticket_created,
        t.updated_at as ticket_updated,
        CASE 
            WHEN t.scanned_at IS NOT NULL AND t.scanned_at != 'infinity'::timestamp THEN 'SCANNED'
            WHEN t.user_id = tt.recipient_id THEN 'ALREADY_CORRECT'
            WHEN tt.recipient_id IS NULL THEN 'NO_RECIPIENT'
            WHEN tt.status != 'COMPLETED' THEN 'NOT_COMPLETED'
            ELSE 'ORPHANED'
        END as issue_type
    FROM tickets t
    LEFT JOIN profiles p1 ON p1.user_id = t.user_id
    LEFT JOIN (
        SELECT DISTINCT ON (ticket_id) 
            ticket_id, 
            recipient_id, 
            status,
            created_at
        FROM ticket_transfers 
        ORDER BY ticket_id, created_at DESC
    ) tt ON tt.ticket_id = t.id
    LEFT JOIN profiles p2 ON p2.user_id = tt.recipient_id
    WHERE tt.ticket_id IS NOT NULL
)
SELECT 
    'DETAILED ANALYSIS' as check_type,
    ticket_id,
    current_owner_name,
    current_owner_email,
    transfer_recipient_name,
    transfer_recipient_email,
    transfer_status,
    issue_type,
    scanned_at,
    transfer_created,
    ticket_updated
FROM orphaned_analysis
WHERE issue_type IN ('ORPHANED', 'SCANNED', 'NO_RECIPIENT', 'NOT_COMPLETED')
ORDER BY transfer_created DESC;

-- Step 2: Check all transfers for this ticket
-- =====================================================
SELECT 
    'ALL TRANSFERS FOR ORPHANED TICKET' as check_type,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    s.name as sender_name,
    tt.recipient_id,
    r.name as recipient_name,
    tt.recipient_email,
    tt.recipient_phone,
    tt.status,
    tt.created_at,
    tt.updated_at
FROM ticket_transfers tt
LEFT JOIN profiles s ON s.user_id = tt.sender_id
LEFT JOIN profiles r ON r.user_id = tt.recipient_id
WHERE tt.ticket_id IN (
    SELECT DISTINCT t.id
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
)
ORDER BY tt.ticket_id, tt.created_at DESC;

-- Step 3: Force fix the orphaned ticket (if safe)
-- =====================================================
WITH orphaned_to_fix AS (
    SELECT 
        t.id as ticket_id,
        tt.recipient_id as correct_owner_id,
        tt.status as transfer_status,
        t.scanned_at
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
      AND tt.recipient_id IS NOT NULL
)
UPDATE tickets 
SET 
    user_id = otf.correct_owner_id,
    updated_at = NOW()
FROM orphaned_to_fix otf
WHERE tickets.id = otf.ticket_id
  AND (tickets.scanned_at IS NULL OR tickets.scanned_at = 'infinity'::timestamp);

-- Step 4: Final verification
-- =====================================================
SELECT 
    'FINAL VERIFICATION' as status,
    COUNT(*) as remaining_orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL FIXED'
        WHEN COUNT(*) = 1 THEN '⚠️ 1 REMAINING - CHECK DETAILS'
        ELSE '❌ MULTIPLE ISSUES REMAIN'
    END as result
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

-- Step 5: Show any remaining issues with full details
-- =====================================================
SELECT 
    'REMAINING ISSUES DETAILS' as status,
    t.id as ticket_id,
    t.user_id as current_owner,
    p1.name as current_owner_name,
    tt.recipient_id as should_be_owner,
    p2.name as should_be_owner_name,
    tt.status as transfer_status,
    t.scanned_at,
    CASE 
        WHEN t.scanned_at IS NOT NULL AND t.scanned_at != 'infinity'::timestamp THEN 'SCANNED - Cannot transfer safely'
        WHEN tt.recipient_id IS NULL THEN 'No recipient in transfer'
        WHEN tt.status != 'COMPLETED' THEN 'Transfer not completed'
        ELSE 'Unknown issue'
    END as reason
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
