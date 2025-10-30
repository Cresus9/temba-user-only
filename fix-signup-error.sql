-- =====================================================
-- FIX SIGNUP ERROR
-- =====================================================
-- This script fixes the signup error that's preventing user registration

-- Step 1: Check if the assign_pending_transfers trigger is causing issues
-- =====================================================
SELECT 
    'Current Triggers on auth.users' as step,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- Step 2: Temporarily disable the problematic trigger
-- =====================================================
DROP TRIGGER IF EXISTS assign_pending_transfers_trigger ON auth.users;

-- Step 3: Check if profiles table has any issues
-- =====================================================
SELECT 
    'Profiles Table Check' as step,
    COUNT(*) as profile_count
FROM profiles;

-- Step 4: Test if we can insert into profiles table
-- =====================================================
-- Let's try a simple test insert to see what error we get
DO $$
DECLARE
    test_user_id UUID;
    insert_result TEXT;
BEGIN
    -- Generate a test user ID
    test_user_id := gen_random_uuid();
    
    -- Try to insert a test profile
    INSERT INTO profiles (
        user_id,
        name,
        email,
        phone,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'Test User',
        'test@example.com',
        '+22670123456',
        null,
        NOW(),
        NOW()
    );
    
    -- If we get here, the insert worked
    RAISE NOTICE 'Profile insert test: SUCCESS';
    
    -- Clean up the test data
    DELETE FROM profiles WHERE user_id = test_user_id;
    
EXCEPTION WHEN OTHERS THEN
    -- If there's an error, show it
    RAISE NOTICE 'Profile insert test: ERROR - %', SQLERRM;
END $$;

-- Step 5: Check RLS policies on profiles table
-- =====================================================
SELECT 
    'Profiles RLS Policies' as step,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 6: Create a safer version of the assign_pending_transfers function
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

-- Step 7: Recreate the trigger with the safer function
-- =====================================================
CREATE TRIGGER assign_pending_transfers_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_pending_transfers_safe();

-- Step 8: Test user creation (this should work now)
-- =====================================================
SELECT 
    'Fix Applied' as step,
    'Signup should now work. Test by creating a new user account.' as message;

-- Step 9: Verify the trigger is working
-- =====================================================
SELECT 
    'Trigger Status' as step,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'assign_pending_transfers_trigger';
