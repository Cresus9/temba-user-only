-- =====================================================
-- CHECK TICKET TRANSFERS RLS POLICIES
-- =====================================================

-- Check RLS policies on ticket_transfers table
SELECT 
    'RLS POLICIES ON TICKET_TRANSFERS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ticket_transfers';

-- Check if RLS is enabled on ticket_transfers
SELECT 
    'RLS STATUS' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'ticket_transfers';

-- Test the exact query that AuthContext is running
-- This should show if RLS is blocking the query
SELECT 
    'TEST AUTHCONTEXT QUERY' as info,
    id,
    ticket_id,
    sender_id,
    recipient_email,
    status,
    created_at
FROM ticket_transfers
WHERE status = 'PENDING'
  AND recipient_email = 'gtr@gmail.com';

-- Check if gtr@gmail.com user exists and get their ID
SELECT 
    'GTR USER ID' as info,
    id,
    email
FROM auth.users 
WHERE email = 'gtr@gmail.com';
