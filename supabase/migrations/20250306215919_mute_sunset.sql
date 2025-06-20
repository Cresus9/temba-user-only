/*
  # Add Crypto Extensions and Token Generation Functions
  
  1. New Extensions
    - pgcrypto: For cryptographic functions
    
  2. Functions
    - create_verification_token: Generates secure verification tokens for guest orders
    
  3. Security
    - Functions are marked as SECURITY DEFINER to run with elevated permissions
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to generate verification tokens
CREATE OR REPLACE FUNCTION create_verification_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_verification_token text;
BEGIN
  -- Generate a secure random token using UUID and current timestamp
  -- Encode as hex for URL-safe format
  SELECT encode(
    digest(
      gen_random_uuid()::text || now()::text,
      'sha256'
    ),
    'hex'
  ) INTO v_verification_token;
  
  RETURN v_verification_token;
END;
$$;

-- Function to create guest orders with verification
CREATE OR REPLACE FUNCTION create_guest_order(
  p_email text,
  p_name text,
  p_event_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_verification_token text;
  v_total numeric := 0;
BEGIN
  -- Input validation
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;

  IF p_name IS NULL OR p_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name is required');
  END IF;

  -- Generate verification token
  v_verification_token := create_verification_token();
  
  -- Start transaction
  BEGIN
    -- Create the order
    INSERT INTO orders (
      event_id,
      guest_email,
      status,
      payment_method,
      ticket_quantities,
      total
    ) VALUES (
      p_event_id,
      p_email,
      'PENDING',
      p_payment_method,
      p_ticket_quantities,
      0 -- Will be updated by trigger
    ) RETURNING id INTO v_order_id;

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

    RETURN jsonb_build_object(
      'success', true,
      'orderId', v_order_id,
      'verificationToken', v_verification_token
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Function to verify guest access
CREATE OR REPLACE FUNCTION verify_guest_access(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_order RECORD;
BEGIN
  -- Find guest order with valid token
  SELECT go.*, o.status
  INTO v_guest_order
  FROM guest_orders go
  JOIN orders o ON o.id = go.order_id
  WHERE go.verification_token = p_token
    AND go.token_expires_at > now()
    AND NOT go.verified;

  IF v_guest_order IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Mark as verified
  UPDATE guest_orders
  SET verified = true
  WHERE order_id = v_guest_order.order_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_guest_order.order_id,
    'email', v_guest_order.email,
    'orderStatus', v_guest_order.status
  );
END;
$$;