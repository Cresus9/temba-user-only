-- Drop existing foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'tickets_user_id_fkey'
    AND table_name = 'tickets'
  ) THEN
    ALTER TABLE tickets DROP CONSTRAINT tickets_user_id_fkey;
  END IF;
END $$;

-- Modify user_id to allow null for guest tickets
ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;

-- Add new foreign key constraint
ALTER TABLE tickets
  ADD CONSTRAINT tickets_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- Update RLS policies to handle guest tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "tickets_access_policy"
  ON tickets FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.guest_email IS NOT NULL
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );