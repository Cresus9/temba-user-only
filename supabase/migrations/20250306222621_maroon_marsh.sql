/*
  # Guest Orders Migration

  1. Changes
    - Drop and recreate verify_guest_access function
    - Add unique constraint on verification token
    - Add RLS policies for guest orders
    - Add cleanup trigger for expired orders

  2. Security
    - Enable RLS on guest_orders table
    - Add policies for guest access
    - Add security definer functions
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS verify_guest_access(text);

-- Add unique constraint to verification token
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'guest_orders_verification_token_key'
  ) THEN
    ALTER TABLE guest_orders
    ADD CONSTRAINT guest_orders_verification_token_key UNIQUE (verification_token);
  END IF;
END $$;

-- Recreate the verify_guest_access function with updated return type
CREATE OR REPLACE FUNCTION verify_guest_access(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_email text;
  v_verified boolean;
  v_expires_at timestamptz;
  v_order_status text;
BEGIN
  -- Find the guest order with matching token
  SELECT 
    order_id,
    email,
    verified,
    token_expires_at
  INTO
    v_order_id,
    v_email,
    v_verified,
    v_expires_at
  FROM guest_orders
  WHERE verification_token = p_token
  AND token_expires_at > now()
  AND NOT verified;

  -- Check if order was found
  IF v_order_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Get order status
  SELECT status INTO v_order_status
  FROM orders
  WHERE id = v_order_id;

  -- Mark as verified
  UPDATE guest_orders
  SET 
    verified = true,
    updated_at = now()
  WHERE verification_token = p_token;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'orderId', v_order_id,
    'email', v_email,
    'orderStatus', v_order_status
  );
END;
$$;

-- Enable RLS on guest_orders if not already enabled
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS guest_orders_select_policy ON guest_orders;
DROP POLICY IF EXISTS guest_orders_insert_policy ON guest_orders;
DROP POLICY IF EXISTS guest_orders_update_policy ON guest_orders;

-- Create new policies
CREATE POLICY guest_orders_select_policy ON guest_orders
  FOR SELECT
  USING (
    verification_token = current_setting('request.jwt.claims', true)::json->>'verification_token'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY guest_orders_insert_policy ON guest_orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY guest_orders_update_policy ON guest_orders
  FOR UPDATE
  USING (
    verification_token = current_setting('request.jwt.claims', true)::json->>'verification_token'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Create function to clean up expired guest orders (as a trigger function)
CREATE OR REPLACE FUNCTION cleanup_expired_guest_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM guest_orders
  WHERE token_expires_at < now()
  AND NOT verified;
  
  RETURN NULL; -- for AFTER triggers
END;
$$;

-- Create or replace trigger for cleanup
DROP TRIGGER IF EXISTS cleanup_expired_guest_orders_trigger ON guest_orders;

CREATE TRIGGER cleanup_expired_guest_orders_trigger
  AFTER INSERT OR UPDATE ON guest_orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_guest_orders();