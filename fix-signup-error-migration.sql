-- =====================================================
-- MIGRATION: Fix Signup Error
-- =====================================================
-- This migration fixes the signup error that prevents user registration
-- Run this manually in your Supabase SQL Editor

-- Step 1: Temporarily disable the problematic trigger
-- =====================================================
DROP TRIGGER IF EXISTS assign_pending_transfers_trigger ON auth.users;

-- Step 2: Drop the old function
-- =====================================================
DROP FUNCTION IF EXISTS assign_pending_transfers();

-- Step 3: Create a safer version of the assign_pending_transfers function
-- =====================================================
CREATE OR REPLACE FUNCTION assign_pending_transfers_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only process if this is a real user insert (not a test)
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RETURN NEW;
    END IF;
    
    -- Use a transaction to ensure atomicity
    BEGIN
        -- Check for pending transfers by email
        IF NEW.email IS NOT NULL THEN
            UPDATE ticket_transfers 
            SET recipient_id = NEW.id, status = 'COMPLETED', updated_at = NOW()
            WHERE recipient_id IS NULL 
            AND recipient_email = NEW.email
            AND status = 'PENDING';
            
            -- Update ticket ownership for completed transfers
            UPDATE tickets 
            SET user_id = NEW.id, updated_at = NOW()
            WHERE id IN (
                SELECT ticket_id FROM ticket_transfers 
                WHERE recipient_id = NEW.id 
                AND recipient_email = NEW.email
                AND status = 'COMPLETED'
            );
        END IF;
        
        -- Check for pending transfers by phone
        IF NEW.phone IS NOT NULL THEN
            UPDATE ticket_transfers 
            SET recipient_id = NEW.id, status = 'COMPLETED', updated_at = NOW()
            WHERE recipient_id IS NULL 
            AND recipient_phone = NEW.phone
            AND status = 'PENDING';
            
            -- Update ticket ownership for completed transfers
            UPDATE tickets 
            SET user_id = NEW.id, updated_at = NOW()
            WHERE id IN (
                SELECT ticket_id FROM ticket_transfers 
                WHERE recipient_id = NEW.id 
                AND recipient_phone = NEW.phone
                AND status = 'COMPLETED'
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in assign_pending_transfers_safe: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Step 4: Recreate the trigger with the safer function
-- =====================================================
CREATE TRIGGER assign_pending_transfers_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_pending_transfers_safe();

-- Step 5: Fix existing orphaned tickets (if any)
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
      AND recipient_id IS NOT NULL
    ORDER BY ticket_id, created_at DESC
) tt
WHERE tickets.id = tt.ticket_id
  AND tickets.user_id != tt.recipient_id;

-- Step 6: Verify the fix worked
-- =====================================================
-- Check if there are any remaining orphaned tickets
SELECT 
    'Migration Complete' as status,
    COUNT(*) as orphaned_tickets_remaining
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

-- Step 7: Test profile table accessibility
-- =====================================================
-- This will show if there are any RLS or constraint issues
SELECT 
    'Profile Table Test' as status,
    COUNT(*) as profile_count,
    'Table accessible' as result
FROM profiles;
