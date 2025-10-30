-- =====================================================
-- CHECK GTR PROFILE
-- =====================================================

-- Check if gtr@gmail.com exists in profiles
SELECT 
    'GTR PROFILE CHECK' as info,
    user_id,
    name,
    email,
    phone,
    created_at
FROM profiles 
WHERE email = 'gtr@gmail.com';

-- Check if gtr@gmail.com exists in auth.users
SELECT 
    'GTR AUTH CHECK' as info,
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'gtr@gmail.com';

-- Check all users with gtr in email
SELECT 
    'ALL GTR USERS' as info,
    id,
    email,
    created_at
FROM auth.users 
WHERE email LIKE '%gtr%';
