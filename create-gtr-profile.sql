-- =====================================================
-- CREATE GTR PROFILE
-- =====================================================

-- First, check if gtr@gmail.com exists in auth.users
SELECT 
    'CHECKING AUTH USER' as info,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'gtr@gmail.com';

-- Create profile for gtr@gmail.com if it doesn't exist
-- Note: This assumes the user exists in auth.users
INSERT INTO profiles (
    user_id,
    name,
    email,
    phone,
    avatar_url,
    created_at,
    updated_at
)
SELECT 
    id as user_id,
    'GTR User' as name,
    email,
    NULL as phone,
    NULL as avatar_url,
    now() as created_at,
    now() as updated_at
FROM auth.users 
WHERE email = 'gtr@gmail.com'
  AND id NOT IN (SELECT user_id FROM profiles WHERE user_id = auth.users.id)
RETURNING *;

-- Verify the profile was created
SELECT 
    'VERIFY PROFILE CREATION' as info,
    user_id,
    name,
    email,
    created_at
FROM profiles 
WHERE email = 'gtr@gmail.com';
