-- ============================================================
-- AUTH MIGRATION REPAIR
-- Run this in the NEW project's Supabase SQL editor (as postgres)
-- ============================================================

-- ── STEP 1: DIAGNOSE ─────────────────────────────────────────
-- How many profiles exist vs how many have a matching auth user?

SELECT
  COUNT(*)                                        AS total_profiles,
  COUNT(au.id)                                    AS profiles_with_auth,
  COUNT(*) - COUNT(au.id)                         AS orphaned_profiles
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.user_id;

-- ── STEP 2: LIST ORPHANED PROFILES ──────────────────────────
-- Profiles that have NO matching auth.users entry
-- These users cannot log in or reset passwords at all.

SELECT
  p.user_id,
  p.email,
  p.phone,
  p.name,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE au.id IS NULL
ORDER BY p.created_at;

-- ── STEP 3: LIST USERS WITH AUTH BUT NO PROFILE ─────────────
-- Reverse: auth.users entries that have no profile row
-- (less common but can cause "profile not found" errors)

SELECT
  au.id,
  au.email,
  au.phone,
  au.created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ORDER BY au.created_at;

-- ── STEP 4: RE-CREATE MISSING PROFILES FOR AUTH USERS ───────
-- If Step 3 found orphaned auth users, create profiles for them.

INSERT INTO public.profiles (user_id, email, name, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ── STEP 5: CHECK auth.users email_confirmed_at ──────────────
-- After migration, email_confirmed_at can be NULL which blocks login
-- even if the password hash is correct. Fix it for all migrated users.

UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at         = NOW()
WHERE email_confirmed_at IS NULL
  AND email IS NOT NULL;

-- Report how many were fixed
SELECT COUNT(*) AS users_email_confirmed_fixed
FROM auth.users
WHERE email_confirmed_at >= NOW() - INTERVAL '5 minutes';

-- ── STEP 6: VERIFY FINAL STATE ───────────────────────────────

SELECT
  'auth.users total'                 AS metric, COUNT(*)::text AS value FROM auth.users
UNION ALL
SELECT
  'profiles total',                              COUNT(*)::text FROM public.profiles
UNION ALL
SELECT
  'profiles WITHOUT auth',
  COUNT(*)::text
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE au.id IS NULL
UNION ALL
SELECT
  'auth WITHOUT profile',
  COUNT(*)::text
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE p.user_id IS NULL;
