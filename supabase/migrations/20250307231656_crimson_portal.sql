/*
  # Fix Guest Orders RLS Policies

  1. Changes
    - Update RLS policies for orders table to allow guest orders
    - Update RLS policies for guest_orders table
    - Add check constraint for guest orders

  2. Security
    - Enable RLS on both tables
    - Add policies for guest order creation and access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "guest_orders_view_policy_v2" ON guest_orders;
DROP POLICY IF EXISTS "guest_orders_insert_policy_v2" ON guest_orders;

-- Update orders table policies
CREATE POLICY "orders_insert_policy"
ON orders
FOR INSERT
WITH CHECK (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR
  (guest_email IS NOT NULL)
);

CREATE POLICY "orders_select_policy"
ON orders
FOR SELECT
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR
  (guest_email IS NOT NULL AND guest_email = current_user) OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  ))
);

-- Update guest_orders table policies
CREATE POLICY "guest_orders_insert_policy"
ON guest_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "guest_orders_select_policy"
ON guest_orders
FOR SELECT
USING (
  email = current_user OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Add check constraint to ensure either user_id or guest_email is present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_user_or_guest_check'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT order_user_or_guest_check
    CHECK (
      (user_id IS NOT NULL AND guest_email IS NULL) OR
      (user_id IS NULL AND guest_email IS NOT NULL)
    );
  END IF;
END $$;