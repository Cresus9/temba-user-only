-- Create guest_orders table
CREATE TABLE guest_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  verification_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add guest_email to orders
ALTER TABLE orders ADD COLUMN guest_email text;

-- Add constraint to ensure either user_id or guest_email is present
ALTER TABLE orders 
  ADD CONSTRAINT order_user_or_guest_check 
  CHECK (
    (user_id IS NOT NULL AND guest_email IS NULL) OR 
    (user_id IS NULL AND guest_email IS NOT NULL)
  );

-- Enable RLS
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_guest_orders_email ON guest_orders(email);
CREATE INDEX idx_guest_orders_verification_token ON guest_orders(verification_token);
CREATE INDEX idx_guest_orders_order_id ON guest_orders(order_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);

-- Create policies for guest orders
CREATE POLICY "guest_orders_select_policy"
  ON guest_orders FOR SELECT
  USING (
    email = current_setting('request.jwt.claims')::json->>'email' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Update orders policies to include guest access
CREATE POLICY "orders_guest_select_policy"
  ON orders FOR SELECT
  USING (
    guest_email = current_setting('request.jwt.claims')::json->>'email' OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create function to create guest order
CREATE OR REPLACE FUNCTION create_guest_order(
  p_email text,
  p_name text,
  p_event_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_verification_token text;
  v_result jsonb;
BEGIN
  -- Generate verification token
  v_verification_token := encode(gen_random_bytes(32), 'hex');

  -- Create order using existing create_order function
  SELECT create_order(
    p_event_id,
    NULL, -- No user_id for guest orders
    p_ticket_quantities,
    p_payment_method
  ) INTO v_result;

  -- Check if order creation was successful
  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  v_order_id := (v_result->>'orderId')::uuid;

  -- Update order with guest email
  UPDATE orders
  SET guest_email = p_email
  WHERE id = v_order_id;

  -- Create guest order record
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    verification_token,
    token_expires_at
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    v_verification_token,
    now() + interval '48 hours'
  );

  -- Return success response with verification token
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'verificationToken', v_verification_token,
    'expiresAt', (now() + interval '48 hours')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create function to verify guest access
CREATE OR REPLACE FUNCTION verify_guest_access(
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_order RECORD;
BEGIN
  -- Get guest order details
  SELECT * INTO v_guest_order
  FROM guest_orders
  WHERE verification_token = p_token
  AND token_expires_at > now()
  AND NOT verified;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Mark as verified
  UPDATE guest_orders
  SET 
    verified = true,
    updated_at = now()
  WHERE verification_token = p_token;

  -- Return success with order details
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_guest_order.order_id,
    'email', v_guest_order.email
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_guest_order TO authenticated;
GRANT EXECUTE ON FUNCTION verify_guest_access TO authenticated;