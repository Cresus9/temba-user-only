# Phone Signup Profile Fix Migration

## Overview
This migration fixes existing profiles where the `name` field was incorrectly set to phone digits instead of the actual user name during phone number signups.

## Problem
When users signed up with phone numbers before the fix, the database trigger (`handle_new_user`) would sometimes use the email prefix (which is the phone digits for phone-only signups like `19174732044@temba.temp`) as the name, resulting in profiles with names like `"19174732044"` instead of their actual names.

## Solution
The migration (`20250201000001_fix_phone_signup_profiles.sql`) does the following:

1. **Identifies problematic profiles:**
   - Profiles where `name` is all digits (e.g., `"19174732044"`)
   - Profiles where `name` matches the normalized phone number

2. **Attempts to recover the correct name:**
   - First, checks `auth.users.raw_user_meta_data->>'name'` (most reliable)
   - If not found, uses email prefix (but skips temporary emails like `@temba.temp`)
   - If still not found, sets a placeholder: `"Utilisateur XXXX"` (where XXXX is last 4 digits of phone)

3. **Updates profiles** with the recovered or placeholder name

4. **Creates a verification function** `check_phone_signup_profiles()` to help identify any remaining issues

## How to Apply

### 1. Review the migration
```bash
cat supabase/migrations/20250201000001_fix_phone_signup_profiles.sql
```

### 2. Apply the migration
```bash
supabase db push
```

Or via Supabase Dashboard:
- Go to Database → Migrations
- Click "Apply migration"

### 3. Verify the fix

#### Option A: Use the verification function
```sql
-- Check which profiles were fixed
SELECT * FROM check_phone_signup_profiles();
```

#### Option B: Manual check
```sql
-- Count profiles with numeric names
SELECT COUNT(*) 
FROM profiles 
WHERE name ~ '^\d+$' OR name ~ '^\+?\d+$';

-- Check specific user
SELECT 
  p.user_id,
  p.name,
  p.phone,
  p.email,
  u.raw_user_meta_data->>'name' AS metadata_name
FROM profiles p
INNER JOIN auth.users u ON u.id = p.user_id
WHERE p.phone IS NOT NULL
  AND (p.name ~ '^\d+$' OR p.name ~ '^\+?\d+$')
LIMIT 10;
```

## Expected Results

### Before Migration
- Profiles with names like `"19174732044"` (phone digits)
- Profile page showing phone digits as the user's name

### After Migration
- Profiles with actual names from `user_metadata`
- If no name available, placeholder: `"Utilisateur 3204"` (last 4 digits)
- Profile page displaying the correct name or placeholder

## Safety

✅ **Safe to run multiple times**: The migration uses conditional updates and won't overwrite good names.

✅ **Non-destructive**: Only updates profiles where the name is clearly phone digits.

✅ **Idempotent**: Can be re-run safely if needed.

⚠️ **Note**: If a user's actual name wasn't stored in `user_metadata` and the email is a temporary one, they'll get a placeholder name. Users can update their name in the Profile page.

## Next Steps After Migration

1. **Inform users**: Consider sending a notification to users who were affected, asking them to verify/update their profile name.

2. **Monitor**: Check `check_phone_signup_profiles()` periodically to ensure no new cases appear.

3. **User self-service**: Users can update their name via the Profile page if they have a placeholder name.

## Related Files
- `supabase/functions/signup/index.ts` - Updated to store correct names
- `src/pages/Profile.tsx` - Updated to display phone numbers correctly
- `src/pages/Dashboard.tsx` - Updated to show correct welcome message

