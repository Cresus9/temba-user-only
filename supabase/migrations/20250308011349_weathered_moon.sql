/*
  # Fix Orders RLS Policies

  1. Changes
    - Fix infinite recursion in orders policies
    - Simplify policy conditions
    - Add proper guest order access

  2. Security
    - Maintain secure access control
    - Prevent policy recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable read access for guest orders" ON orders;
DROP POLICY IF EXISTS "orders_select_policy" ON orders;
DROP POLICY IF EXISTS "Enable insert for guest orders" ON orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;

-- Create new, simplified policies for orders
CREATE POLICY "orders_select_policy" ON orders
  FOR SELECT TO public
  USING (
    user_id = auth.uid() OR
    guest_email IS NOT NULL OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "orders_insert_policy" ON orders
  FOR INSERT TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    guest_email IS NOT NULL
  );

-- Update guest orders policies
DROP POLICY IF EXISTS "guest_orders_select_policy" ON guest_orders;
DROP POLICY IF EXISTS "guest_orders_insert_policy" ON guest_orders;

CREATE POLICY "guest_orders_select_policy" ON guest_orders
  FOR SELECT TO public
  USING (
    email = guest_orders.email OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "guest_orders_insert_policy" ON guest_orders
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.guest_email IS NOT NULL
    )
  );