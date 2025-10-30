-- =====================================================
-- TEST TICKET TRANSFER OWNERSHIP
-- =====================================================
-- Run this script to create a test transfer and verify ownership changes

-- Step 1: Get a ticket and user for testing
-- =====================================================
WITH test_data AS (
    SELECT 
        t.id as ticket_id,
        t.user_id as sender_id,
        u.email as sender_email
    FROM tickets t
    JOIN auth.users u ON u.id = t.user_id
    WHERE t.status = 'VALID'
    LIMIT 1
)
SELECT 
    'Test Data Selected' as step,
    ticket_id,
    sender_id,
    sender_email
FROM test_data;

-- Step 2: Create a test transfer (uncomment to run)
-- =====================================================
/*
-- First, let's create a test transfer
INSERT INTO ticket_transfers (
    ticket_id,
    sender_id,
    recipient_email,
    recipient_name,
    message,
    status
) 
SELECT 
    t.id,
    t.user_id,
    'test-recipient@example.com',
    'Test Recipient',
    'Test transfer for ownership verification',
    'PENDING'
FROM tickets t
WHERE t.status = 'VALID'
LIMIT 1
RETURNING 
    id as transfer_id,
    ticket_id,
    sender_id,
    recipient_email,
    status;
*/

-- Step 3: Check the transfer was created
-- =====================================================
SELECT 
    'Transfer Created' as step,
    id as transfer_id,
    ticket_id,
    sender_id,
    recipient_email,
    status,
    created_at
FROM ticket_transfers 
WHERE recipient_email = 'test-recipient@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Step 4: Simulate recipient signup (create a test user)
-- =====================================================
/*
-- Create a test recipient user
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'test-recipient@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test Recipient"}'
)
RETURNING id, email;
*/

-- Step 5: Check if ownership was transferred after user creation
-- =====================================================
SELECT 
    'Ownership After Signup' as step,
    t.id as ticket_id,
    t.user_id as current_owner,
    p.name as owner_name,
    p.email as owner_email,
    tt.status as transfer_status,
    tt.updated_at as transfer_updated
FROM tickets t
LEFT JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN ticket_transfers tt ON tt.ticket_id = t.id
WHERE tt.recipient_email = 'test-recipient@example.com'
ORDER BY tt.created_at DESC
LIMIT 1;

-- Step 6: Verify the trigger worked
-- =====================================================
SELECT 
    'Trigger Verification' as step,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.recipient_id,
    tt.status,
    p.name as recipient_name,
    p.email as recipient_email
FROM ticket_transfers tt
LEFT JOIN profiles p ON p.user_id = tt.recipient_id
WHERE tt.recipient_email = 'test-recipient@example.com'
ORDER BY tt.created_at DESC
LIMIT 1;

-- Step 7: Clean up test data (uncomment to run)
-- =====================================================
/*
-- Delete test transfer
DELETE FROM ticket_transfers 
WHERE recipient_email = 'test-recipient@example.com';

-- Delete test user (if created)
DELETE FROM auth.users 
WHERE email = 'test-recipient@example.com';
*/
