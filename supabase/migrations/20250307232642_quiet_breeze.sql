/*
  # Fix Guest Orders System

  1. Changes
    - Update RLS policies for orders and guest_orders tables
    - Add policies for guest order creation and access
    - Add check constraint for guest orders validation
    - Add token column to guest_orders table

  2. Security
    - Enable RLS on both tables
    - Add policies for guest access
    - Ensure proper data isolation
*/

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Add token column to guest_orders if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guest_orders' AND column_name = 'token'
  ) THEN
    ALTER TABLE guest_orders ADD COLUMN token uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_insert_policy_20250307" ON orders;
DROP POLICY IF EXISTS "orders_select_policy_20250307" ON orders;
DROP POLICY IF EXISTS "guest_orders_insert_policy_20250307" ON guest_orders;
DROP POLICY IF EXISTS "guest_orders_select_policy_20250307" ON guest_orders;

-- Create new policies for orders
CREATE POLICY "orders_insert_policy_20250307"
ON orders
FOR INSERT
TO public
WITH CHECK (
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR
  (guest_email IS NOT NULL)
);

CREATE POLICY "orders_select_policy_20250307"
ON orders
FOR SELECT
TO public
USING (
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR
  ((guest_email IS NOT NULL) AND (guest_email = current_user)) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ))
);

-- Create new policies for guest_orders
CREATE POLICY "guest_orders_insert_policy_20250307"
ON guest_orders
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "guest_orders_select_policy_20250307"
ON guest_orders
FOR SELECT
TO public
USING (
  (email = current_user) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ))
);

-- Add check constraint for orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS order_user_or_guest_check;
ALTER TABLE orders
ADD CONSTRAINT order_user_or_guest_check
CHECK (
  ((user_id IS NOT NULL) AND (guest_email IS NULL)) OR
  ((user_id IS NULL) AND (guest_email IS NOT NULL))
);