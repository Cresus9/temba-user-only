/*
  # Fix Orders RLS Policies

  1. Changes
    - Update RLS policies for orders table to handle guest orders
    - Add policies for guest order creation and access
    - Add check constraint for guest orders validation

  2. Security
    - Enable RLS on orders table
    - Add policies for guest access
    - Ensure proper data isolation
*/

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_insert_policy_20250307" ON orders;
DROP POLICY IF EXISTS "orders_select_policy_20250307" ON orders;

-- Create new policies for orders
CREATE POLICY "orders_insert_policy_20250307"
ON orders
FOR INSERT
TO public
WITH CHECK (
  (guest_email IS NOT NULL) OR
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))
);

CREATE POLICY "orders_select_policy_20250307"
ON orders
FOR SELECT
TO public
USING (
  (guest_email IS NOT NULL AND guest_email = current_user) OR
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'ADMIN'
  ))
);

-- Add check constraint for orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS order_user_or_guest_check;
ALTER TABLE orders
ADD CONSTRAINT order_user_or_guest_check
CHECK (
  (user_id IS NOT NULL AND guest_email IS NULL) OR
  (user_id IS NULL AND guest_email IS NOT NULL)
);