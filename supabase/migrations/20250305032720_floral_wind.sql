-- Drop existing function
DROP FUNCTION IF EXISTS create_guest_order;

-- Create improved guest order function with secure token generation
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
  -- Generate verification token using md5 and random values
  v_verification_token := md5(
    p_email || 
    p_event_id::text || 
    random()::text || 
    clock_timestamp()::text
  );

  -- Create order
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_guest_order TO authenticated;