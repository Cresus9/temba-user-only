-- ============================================================
-- RE-INVITE ORPHANED USERS (run AFTER fix-auth-migration.sql)
--
-- This script generates a list of affected email addresses so
-- you can bulk-send password-reset invitations from the
-- Supabase dashboard or via the Admin API.
--
-- Option A — Supabase Dashboard
--   Authentication → Users → select user → "Send magic link" / "Reset password"
--
-- Option B — Admin API (run from a trusted server/Edge Function)
--   POST /auth/v1/admin/users/{user_id}/invite
--   Authorization: Bearer <SERVICE_ROLE_KEY>
--
-- Option C — SQL (updates confirmed_at so existing passwords work again)
--   Uncomment and run the UPDATE block below.
-- ============================================================

-- 1. List all users with unconfirmed emails (likely cause of "user not authenticated")
SELECT
  id,
  email,
  phone,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email_confirmed_at IS NULL
   OR (email IS NOT NULL AND email NOT LIKE '%@temba.temp' AND email_confirmed_at IS NULL)
ORDER BY created_at;

-- 2. List phone-signup users (@temba.temp) with no confirmed email
--    These need a password reset through the phone OTP flow instead.
SELECT
  id,
  email,
  phone,
  created_at
FROM auth.users
WHERE email LIKE '%@temba.temp'
ORDER BY created_at;

-- ── Option C: Force-confirm all unconfirmed emails ──────────
-- WARNING: Only do this if you trust all migrated users.
-- This lets them log in with their existing password immediately.

/*
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, created_at),
  updated_at         = NOW()
WHERE email_confirmed_at IS NULL;

SELECT 'Confirmed emails updated: ' || COUNT(*) FROM auth.users
WHERE email_confirmed_at >= NOW() - INTERVAL '1 minute';
*/

-- ── Helpful: count by confirmation status ───────────────────
SELECT
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN 'confirmed'
    ELSE 'unconfirmed'
  END                AS email_status,
  COUNT(*)           AS user_count
FROM auth.users
GROUP BY 1;
