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
  -- Get guest order details with proper error handling
  BEGIN
    SELECT 
      go.*,
      o.id as order_id,
      o.status as order_status
    INTO STRICT v_guest_order
    FROM guest_orders go
    JOIN orders o ON o.id = go.order_id
    WHERE go.verification_token = p_token
    AND go.token_expires_at > now()
    AND NOT go.verified;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid or expired verification token'
      );
    WHEN TOO_MANY_ROWS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Multiple verification tokens found. Please contact support.'
      );
  END;

  -- Mark as verified
  UPDATE guest_orders
  SET 
    verified = true,
    updated_at = now()
  WHERE verification_token = p_token
  AND NOT verified
  AND token_expires_at > now();

  -- Return success with order details
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_guest_order.order_id,
    'email', v_guest_order.email,
    'orderStatus', v_guest_order.order_status
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'An error occurred while verifying the token: ' || SQLERRM
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION verify_guest_access TO authenticated;
GRANT EXECUTE ON FUNCTION verify_guest_access TO anon;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_guest_orders_verification_token 
ON guest_orders(verification_token);

-- Create index for expiration checks
CREATE INDEX IF NOT EXISTS idx_guest_orders_expires_at 
ON guest_orders(token_expires_at);

-- Create index for verification status
CREATE INDEX IF NOT EXISTS idx_guest_orders_verified 
ON guest_orders(verified);