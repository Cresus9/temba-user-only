/*
  # Guest Order Verification Functions

  1. New Functions
    - `verify_guest_access` - Verifies guest access token and returns order details
    - `validate_guest_token` - Validates guest token format and expiration

  2. Security
    - Functions are accessible to public (unauthenticated users)
    - Input validation for tokens
    - Token expiration handling
*/

-- Function to validate guest token format and expiration
CREATE OR REPLACE FUNCTION validate_guest_token(
  p_token text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if token exists in guest_orders
  RETURN EXISTS (
    SELECT 1 
    FROM guest_orders 
    WHERE verification_token = p_token
    AND token_expires_at > NOW()
    AND NOT verified
  );
END;
$$;

-- Function to verify guest access and return order details
CREATE OR REPLACE FUNCTION verify_guest_access(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_order guest_orders;
  v_order orders;
  v_event events;
BEGIN
  -- Validate token
  IF NOT validate_guest_token(p_token) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Get guest order details
  SELECT * INTO v_guest_order
  FROM guest_orders
  WHERE verification_token = p_token;

  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = v_guest_order.order_id;

  -- Get event details
  SELECT * INTO v_event
  FROM events
  WHERE id = v_order.event_id;

  -- Mark token as verified
  UPDATE guest_orders
  SET verified = true
  WHERE verification_token = p_token;

  -- Return success response with order details
  RETURN jsonb_build_object(
    'success', true,
    'email', v_guest_order.email,
    'orderId', v_order.id,
    'eventTitle', v_event.title,
    'orderStatus', v_order.status
  );
END;
$$;