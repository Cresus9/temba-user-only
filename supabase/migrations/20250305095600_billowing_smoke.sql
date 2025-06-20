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
  v_order_id uuid;
BEGIN
  -- Get guest order details with proper error handling
  SELECT 
    go.*,
    o.id as order_id,
    o.status as order_status,
    o.event_id,
    e.title as event_title
  INTO v_guest_order
  FROM guest_orders go
  JOIN orders o ON o.id = go.order_id
  JOIN events e ON e.id = o.event_id
  WHERE go.verification_token = p_token
  AND go.token_expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Check if already verified
  IF v_guest_order.verified THEN
    -- If already verified, just return success with order details
    RETURN jsonb_build_object(
      'success', true,
      'orderId', v_guest_order.order_id,
      'email', v_guest_order.email,
      'orderStatus', v_guest_order.order_status,
      'eventTitle', v_guest_order.event_title
    );
  END IF;

  -- Mark as verified
  UPDATE guest_orders
  SET 
    verified = true,
    updated_at = now()
  WHERE verification_token = p_token
  AND token_expires_at > now()
  RETURNING order_id INTO v_order_id;

  -- Verify the update happened
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to verify token'
    );
  END IF;

  -- Return success with order details
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_guest_order.order_id,
    'email', v_guest_order.email,
    'orderStatus', v_guest_order.order_status,
    'eventTitle', v_guest_order.event_title
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

-- Create or update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_orders_verification_token 
ON guest_orders(verification_token);

CREATE INDEX IF NOT EXISTS idx_guest_orders_expires_at 
ON guest_orders(token_expires_at);

CREATE INDEX IF NOT EXISTS idx_guest_orders_verified 
ON guest_orders(verified);

-- Create view for guest ticket details
CREATE OR REPLACE VIEW guest_ticket_details AS
SELECT 
  t.*,
  tt.name as ticket_type_name,
  tt.price as ticket_type_price,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.image_url as event_image,
  go.name as guest_name,
  go.email as guest_email
FROM tickets t
JOIN ticket_types tt ON tt.id = t.ticket_type_id
JOIN events e ON e.id = t.event_id
JOIN orders o ON o.id = t.order_id
JOIN guest_orders go ON go.order_id = o.id;

-- Grant access to the view
GRANT SELECT ON guest_ticket_details TO authenticated;
GRANT SELECT ON guest_ticket_details TO anon;