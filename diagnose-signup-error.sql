-- =====================================================
-- DIAGNOSE SIGNUP ERROR
-- =====================================================
-- This script helps diagnose why user registration is failing

-- 1. Check if profiles table exists and has correct structure
-- =====================================================
SELECT 
    'Profiles Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS policies on profiles table
-- =====================================================
SELECT 
    'Profiles RLS Policies' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Check if profiles table is enabled for RLS
-- =====================================================
SELECT 
    'Profiles RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles' 
  AND schemaname = 'public';

-- 4. Test inserting a profile (this will show the exact error)
-- =====================================================
-- First, let's see what users exist
SELECT 
    'Existing Users' as check_type,
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if there are any foreign key constraints
-- =====================================================
SELECT 
    'Foreign Key Constraints' as check_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'profiles';

-- 6. Check if the assign_pending_transfers trigger is causing issues
-- =====================================================
SELECT 
    'Transfer Triggers' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%transfer%' 
  OR trigger_name LIKE '%assign%';

-- 7. Test a simple profile insert (commented out - uncomment to test)
-- =====================================================
/*
-- This will show the exact error if there is one
INSERT INTO profiles (
    user_id,
    name,
    email,
    phone,
    avatar_url,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Test User',
    'test@example.com',
    '+22670123456',
    null,
    NOW(),
    NOW()
);
*/

-- 8. Check for any recent errors in the logs (if available)
-- =====================================================
SELECT 
    'Recent Activity' as check_type,
    'Check Supabase logs for detailed error messages' as message;
