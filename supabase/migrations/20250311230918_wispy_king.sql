/*
  # Remove email unique constraint from profiles

  1. Changes
    - Remove unique constraint on email column in profiles table
    - Email uniqueness is already enforced by Supabase Auth
    - Allows multiple profiles to share same email (e.g. for guest orders)
  
  2. Security
    - No changes to RLS policies
    - Maintains data integrity through auth.users email uniqueness
*/

-- Remove unique constraint and index from email column
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS profiles_email_idx;

-- Recreate non-unique index for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);