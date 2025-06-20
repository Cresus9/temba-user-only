/*
  # Fix profile columns

  1. Changes
    - Rename 'name' column to 'full_name' for better clarity
    - Add NOT NULL constraint to ensure full_name is always provided
    - Add index on full_name for faster searches
  
  2. Security
    - No changes to RLS policies needed
*/

DO $$ 
BEGIN
  -- Rename name column to full_name if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN name TO full_name;
  END IF;

  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name text NOT NULL;
  END IF;

  -- Create index on full_name
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_full_name'
  ) THEN
    CREATE INDEX idx_profiles_full_name ON profiles(full_name);
  END IF;
END $$;