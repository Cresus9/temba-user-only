/*
  # Fix Notifications Foreign Key Reference

  1. Changes
    - Update notifications table foreign key to reference profiles instead of users
    - Drop existing foreign key constraint
    - Add new foreign key constraint referencing profiles.user_id

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key if it exists
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Add new foreign key constraint referencing profiles.user_id
ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recreate policies if they don't exist
DO $$ 
BEGIN
  -- Policy for users to view their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" 
    ON notifications FOR SELECT 
    TO public 
    USING (auth.uid() = user_id);
  END IF;

  -- Policy for users to update their own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" 
    ON notifications FOR UPDATE 
    TO public 
    USING (auth.uid() = user_id);
  END IF;

  -- Policy for system to create notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'System can create notifications'
  ) THEN
    CREATE POLICY "System can create notifications" 
    ON notifications FOR INSERT 
    TO public 
    WITH CHECK (true);
  END IF;
END $$;