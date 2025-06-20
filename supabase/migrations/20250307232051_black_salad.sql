/*
  # Fix Guest Orders RLS Policies

  1. Changes
    - Drop all existing policies for orders and guest_orders tables
    - Create new RLS policies for guest order flow
    - Add check constraint for orders table
    - Add policies for unauthenticated access

  2. Security
    - Enable RLS on both tables
    - Add policies for guest order creation and access
    - Allow public access for guest order creation
*/

-- Drop ALL existing policies for both tables to avoid conflicts
DO $$
BEGIN
  -- Drop orders policies
  DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
  DROP POLICY IF EXISTS "orders_select_policy" ON orders;
  DROP POLICY IF EXISTS "orders_insert_policy_v2" ON orders;
  DROP POLICY IF EXISTS "orders_select_policy_v2" ON orders;
  DROP POLICY IF EXISTS "orders_insert_policy_v3" ON orders;
  DROP POLICY IF EXISTS "orders_select_policy_v3" ON orders;
  DROP POLICY IF EXISTS "orders_guest_select_policy" ON orders;
  DROP POLICY IF EXISTS "orders_insert_policy_new" ON orders;
  DROP POLICY IF EXISTS "orders_select_policy_new" ON orders;
  
  -- Drop guest_orders policies
  DROP POLICY IF EXISTS "guest_orders_view_policy" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_insert_policy" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_view_policy_v2" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_insert_policy_v2" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_view_policy_v3" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_insert_policy_v3" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_select_policy" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_insert_policy_new" ON guest_orders;
  DROP POLICY IF EXISTS "guest_orders_select_policy_new" ON guest_orders;
END $$;

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Create new orders policies
CREATE POLICY "orders_insert_policy_20250307"
ON orders
FOR INSERT
TO public
WITH CHECK (
  -- Allow either authenticated users to create their own orders
  -- or allow guest orders with email
  ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
   (guest_email IS NOT NULL))
);

CREATE POLICY "orders_select_policy_20250307"
ON orders
FOR SELECT
TO public
USING (
  -- Allow users to view their own orders
  -- Allow guests to view their orders by email
  -- Allow admins to view all orders
  ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
   (guest_email IS NOT NULL AND guest_email = current_user) OR
   (EXISTS (
     SELECT 1 FROM profiles
     WHERE user_id = auth.uid()
     AND role = 'ADMIN'
   )))
);

-- Create new guest_orders policies
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
  -- Allow guests to view their own orders
  -- Allow admins to view all orders
  email = current_user OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Add or update check constraint for orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_user_or_guest_check'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT order_user_or_guest_check
    CHECK (
      (user_id IS NOT NULL AND guest_email IS NULL) OR
      (user_id IS NULL AND guest_email IS NOT NULL)
    );
  END IF;
END $$;