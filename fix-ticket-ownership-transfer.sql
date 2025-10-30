-- =====================================================
-- FIX TICKET OWNERSHIP TRANSFER ISSUE
-- =====================================================
-- This script fixes the broken ticket ownership transfer system

-- Step 1: Update the transfer-ticket Edge Function to actually transfer ownership
-- =====================================================

-- First, let's check the current transfer-ticket function
SELECT 
    'Current Transfer Function' as step,
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'transfer_ticket' OR proname LIKE '%transfer%';

-- Step 2: Create a function to fix existing orphaned tickets
-- =====================================================
CREATE OR REPLACE FUNCTION fix_orphaned_tickets()
RETURNS TABLE(
    ticket_id UUID,
    old_owner_id UUID,
    new_owner_id UUID,
    transfer_id UUID,
    status TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update tickets that should have been transferred
    UPDATE tickets 
    SET 
        user_id = tt.recipient_id,
        updated_at = NOW()
    FROM (
        SELECT DISTINCT ON (ticket_id) 
            ticket_id, 
            recipient_id,
            id as transfer_id
        FROM ticket_transfers 
        WHERE status = 'COMPLETED' 
          AND recipient_id IS NOT NULL
        ORDER BY ticket_id, created_at DESC
    ) tt
    WHERE tickets.id = tt.ticket_id
      AND tickets.user_id != tt.recipient_id
    RETURNING 
        tickets.id as ticket_id,
        tickets.user_id as old_owner_id,
        tt.recipient_id as new_owner_id,
        tt.transfer_id,
        'FIXED'::TEXT as status;
END;
$$;

-- Step 3: Run the fix for orphaned tickets
-- =====================================================
SELECT 
    'Fixing Orphaned Tickets' as step,
    *
FROM fix_orphaned_tickets();

-- Step 4: Verify the fix worked
-- =====================================================
SELECT 
    'Verification After Fix' as step,
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

-- Step 5: Show updated ownership
-- =====================================================
SELECT 
    'Updated Ticket Ownership' as step,
    t.id as ticket_id,
    t.user_id as current_owner,
    p.name as owner_name,
    p.email as owner_email,
    tt.recipient_id as transfer_recipient,
    r.name as recipient_name,
    tt.status as transfer_status
FROM tickets t
LEFT JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        status
    FROM ticket_transfers 
    WHERE status = 'COMPLETED'
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
LEFT JOIN profiles r ON r.user_id = tt.recipient_id
WHERE tt.ticket_id IS NOT NULL
ORDER BY tt.created_at DESC
LIMIT 10;

-- Step 6: Clean up the temporary function
-- =====================================================
DROP FUNCTION IF EXISTS fix_orphaned_tickets();
