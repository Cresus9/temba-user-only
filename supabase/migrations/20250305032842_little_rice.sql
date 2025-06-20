-- First check if constraint exists and drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_user_or_guest_check'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT order_user_or_guest_check;
  END IF;
END $$;

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_user_id_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
  END IF;
END $$;

-- Modify user_id to allow null for guest orders
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Add new foreign key constraint
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Add guest_email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN guest_email text;
  END IF;
END $$;

-- Add constraint to ensure either user_id or guest_email is present
ALTER TABLE orders 
  ADD CONSTRAINT order_user_or_guest_check 
  CHECK (
    (user_id IS NOT NULL AND guest_email IS NULL) OR 
    (user_id IS NULL AND guest_email IS NOT NULL)
  );

-- Create index for guest orders if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);