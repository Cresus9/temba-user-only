-- =====================================================
-- FIX PHONE SIGNUP PROFILES
-- =====================================================
-- This migration fixes existing profiles where the name
-- was incorrectly set to phone digits instead of the actual name
-- during phone number signups.

DO $$
DECLARE
  fixed_count INTEGER := 0;
  profile_record RECORD;
  user_name TEXT;
  phone_digits TEXT;
  email_prefix TEXT;
BEGIN
  -- Loop through profiles where name might be phone digits
  FOR profile_record IN 
    SELECT 
      p.user_id,
      p.name,
      p.phone,
      p.email,
      u.raw_user_meta_data
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.user_id
    WHERE 
      -- Name is all digits (likely phone digits)
      (p.name ~ '^\d+$' OR p.name ~ '^\+?\d+$')
      -- OR name matches normalized phone digits
      OR (
        p.phone IS NOT NULL 
        AND (
          -- Remove + and non-digits from phone, compare with name
          REPLACE(REPLACE(p.phone, '+', ''), ' ', '') = REPLACE(REPLACE(p.name, '+', ''), ' ', '')
          -- OR name is just digits from phone
          OR p.name = REPLACE(REPLACE(p.phone, '+', ''), ' ', '')
        )
      )
  LOOP
    -- Extract phone digits (remove + and spaces)
    phone_digits := REPLACE(REPLACE(COALESCE(profile_record.phone, ''), '+', ''), ' ', '');
    
    -- Try to get name from user_metadata first (most reliable)
    user_name := profile_record.raw_user_meta_data->>'name';
    
    -- If no name in metadata, try email prefix (but skip if email is temp email)
    IF user_name IS NULL OR user_name = '' THEN
      IF profile_record.email IS NOT NULL 
         AND NOT profile_record.email LIKE '%@temba.temp'
         AND NOT profile_record.email LIKE '%@temp.%' THEN
        email_prefix := SPLIT_PART(profile_record.email, '@', 1);
        -- Only use email prefix if it's not the same as phone digits
        IF email_prefix != phone_digits THEN
          user_name := email_prefix;
        END IF;
      END IF;
    END IF;
    
    -- If still no good name, set a placeholder
    IF user_name IS NULL OR user_name = '' OR user_name = phone_digits THEN
      IF profile_record.phone IS NOT NULL THEN
        -- Use formatted phone as display name
        user_name := 'Utilisateur ' || SUBSTRING(profile_record.phone, -4); -- Last 4 digits
      ELSE
        user_name := 'Utilisateur';
      END IF;
    END IF;
    
    -- Update the profile
    UPDATE profiles
    SET 
      name = user_name,
      updated_at = NOW()
    WHERE user_id = profile_record.user_id
      AND (name = profile_record.name); -- Only update if name hasn't changed
    
    fixed_count := fixed_count + 1;
    
    RAISE NOTICE 'Fixed profile for user %: "%" -> "%"', 
      profile_record.user_id, 
      profile_record.name, 
      user_name;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: Fixed % profiles', fixed_count;
END $$;

-- Create a function to help identify problematic profiles (for verification)
CREATE OR REPLACE FUNCTION check_phone_signup_profiles()
RETURNS TABLE (
  user_id UUID,
  current_name TEXT,
  phone TEXT,
  email TEXT,
  has_metadata_name BOOLEAN,
  metadata_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.name AS current_name,
    p.phone,
    p.email,
    (u.raw_user_meta_data->>'name' IS NOT NULL) AS has_metadata_name,
    (u.raw_user_meta_data->>'name')::TEXT AS metadata_name
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.user_id
  WHERE 
    -- Name is all digits (likely phone digits)
    (p.name ~ '^\d+$' OR p.name ~ '^\+?\d+$')
    -- OR name matches normalized phone digits
    OR (
      p.phone IS NOT NULL 
      AND (
        REPLACE(REPLACE(p.phone, '+', ''), ' ', '') = REPLACE(REPLACE(p.name, '+', ''), ' ', '')
        OR p.name = REPLACE(REPLACE(p.phone, '+', ''), ' ', '')
      )
    )
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for debugging)
GRANT EXECUTE ON FUNCTION check_phone_signup_profiles() TO authenticated;

