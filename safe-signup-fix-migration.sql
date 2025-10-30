-- =====================================================
-- SAFE MIGRATION: Fix Signup Error (Option A - Recommended)
-- =====================================================
-- This migration safely fixes signup by removing the problematic trigger
-- and provides a safe way to handle pending transfers

-- Step 1: Remove the problematic trigger that blocks signup
-- =====================================================
DROP TRIGGER IF EXISTS assign_pending_transfers_trigger ON auth.users;

-- Step 2: Drop the old function
-- =====================================================
DROP FUNCTION IF EXISTS assign_pending_transfers();

-- Step 3: Create a safe RPC function to handle pending transfers after login
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_pending_transfers()
RETURNS TABLE(
    claimed_count INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_phone TEXT;
    v_claimed_count INTEGER := 0;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT 0, 'User not authenticated'::TEXT;
        RETURN;
    END IF;
    
    -- Get user email and phone
    SELECT 
        COALESCE(lower(trim(email)), ''),
        COALESCE(trim(phone), '')
    INTO v_email, v_phone
    FROM auth.users 
    WHERE id = v_user_id;
    
    -- Don't process if no identifiers
    IF v_email = '' AND v_phone = '' THEN
        RETURN QUERY SELECT 0, 'No email or phone found'::TEXT;
        RETURN;
    END IF;
    
    -- 1) Complete PENDING transfers addressed to this user
    UPDATE ticket_transfers tt
    SET 
        recipient_id = v_user_id,
        status = 'COMPLETED',
        updated_at = NOW()
    WHERE tt.status = 'PENDING'
      AND tt.recipient_id IS NULL
      AND (
          (v_email != '' AND lower(tt.recipient_email) = v_email)
          OR (v_phone != '' AND tt.recipient_phone = v_phone)
      );
    
    GET DIAGNOSTICS v_claimed_count = ROW_COUNT;
    
    -- 2) Transfer ticket ownership for completed transfers
    -- Only for tickets that haven't been scanned
    WITH latest_completed AS (
        SELECT DISTINCT ON (ticket_id)
            ticket_id, 
            recipient_id, 
            status, 
            updated_at
        FROM ticket_transfers
        WHERE status = 'COMPLETED'
          AND recipient_id = v_user_id
        ORDER BY ticket_id, updated_at DESC
    )
    UPDATE tickets t
    SET 
        user_id = lc.recipient_id,
        updated_at = NOW()
    FROM latest_completed lc
    WHERE t.id = lc.ticket_id
      AND t.user_id IS DISTINCT FROM lc.recipient_id
      AND (t.scanned_at IS NULL OR t.scanned_at = 'infinity'::timestamp);
    
    -- Return results
    IF v_claimed_count > 0 THEN
        RETURN QUERY SELECT v_claimed_count, format('Successfully claimed %s pending transfers', v_claimed_count);
    ELSE
        RETURN QUERY SELECT 0, 'No pending transfers found for this user';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, format('Error claiming transfers: %s', SQLERRM);
END;
$$;

-- Step 4: Fix existing orphaned tickets (safe version)
-- =====================================================
WITH latest_completed AS (
    SELECT DISTINCT ON (ticket_id)
        ticket_id, 
        recipient_id, 
        status, 
        created_at
    FROM ticket_transfers
    WHERE status = 'COMPLETED' 
      AND recipient_id IS NOT NULL
    ORDER BY ticket_id, created_at DESC
)
UPDATE tickets t
SET 
    user_id = lc.recipient_id,
    updated_at = NOW()
FROM latest_completed lc
WHERE t.id = lc.ticket_id
  AND t.user_id IS DISTINCT FROM lc.recipient_id
  AND (t.scanned_at IS NULL OR t.scanned_at = 'infinity'::timestamp);

-- Step 5: Grant execute permission to authenticated users
-- =====================================================
GRANT EXECUTE ON FUNCTION public.claim_pending_transfers() TO authenticated;

-- Step 6: Verify the fix
-- =====================================================
SELECT 
    'Migration Complete' as status,
    'Signup should now work without blocking triggers' as message;

-- Check remaining orphaned tickets
SELECT 
    'Orphaned Tickets Check' as status,
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
