-- Drop existing function if it exists
DROP FUNCTION IF EXISTS verify_guest_access;

-- Create improved guest access verification function
CREATE OR REPLACE FUNCTION verify_guest_access(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_order RECORD;
BEGIN
  -- Get guest order details
  SELECT 
    go.*,
    o.id as order_id,
    o.status as order_status
  INTO v_guest_order
  FROM guest_orders go
  JOIN orders o ON o.id = go.order_id
  WHERE go.verification_token = p_token
  AND go.token_expires_at > now()
  AND NOT go.verified;

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
    'email', v_guest_order.email,
    'orderStatus', v_guest_order.order_status
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION verify_guest_access TO authenticated;
GRANT EXECUTE ON FUNCTION verify_guest_access TO anon;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_guest_orders_verification_token 
ON guest_orders(verification_token);