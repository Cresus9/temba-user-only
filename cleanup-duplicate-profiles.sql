-- =====================================================
-- CLEANUP DUPLICATE PROFILES
-- =====================================================

-- Step 1: Find duplicate profiles
-- =====================================================
SELECT 
    'DUPLICATE PROFILES FOUND' as info,
    user_id,
    COUNT(*) as count,
    array_agg(id) as profile_ids,
    array_agg(name) as names,
    array_agg(email) as emails
FROM profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: Keep the most recent profile for each user_id
-- =====================================================
WITH ranked_profiles AS (
    SELECT 
        id,
        user_id,
        name,
        email,
        phone,
        avatar_url,
        created_at,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY updated_at DESC, created_at DESC
        ) as rn
    FROM profiles
),
profiles_to_delete AS (
    SELECT id 
    FROM ranked_profiles 
    WHERE rn > 1
)
DELETE FROM profiles 
WHERE id IN (SELECT id FROM profiles_to_delete);

-- Step 3: Verify cleanup
-- =====================================================
SELECT 
    'CLEANUP COMPLETE' as status,
    'Duplicate profiles removed' as message;

-- Step 4: Final count
-- =====================================================
SELECT 
    'FINAL COUNT' as status,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT user_id) as unique_users
FROM profiles;
