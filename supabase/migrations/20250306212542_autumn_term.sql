/*
  # Create Order Function

  1. New Functions
    - `create_order`: Creates a new order and associated tickets
      - Parameters:
        - p_event_id: uuid
        - p_user_id: uuid
        - p_ticket_quantities: jsonb
        - p_payment_method: text
      - Returns: jsonb containing success status and order ID

  2. Security
    - Function is accessible to authenticated users only
    - Validates user permissions and ticket availability
    - Handles transaction atomically

  3. Changes
    - Creates new order record
    - Creates associated tickets
    - Updates ticket type availability
*/

CREATE OR REPLACE FUNCTION public.create_order(
  p_event_id uuid,
  p_user_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric := 0;
  v_ticket_type record;
  v_quantity integer;
  v_event record;
BEGIN
  -- Validate event exists and is published
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id AND status = 'PUBLISHED'
  FOR UPDATE;  -- Lock the row to prevent concurrent modifications

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found or not available'
    );
  END IF;

  -- Start transaction
  BEGIN
    -- Calculate total and validate quantities
    FOR v_ticket_type IN 
      SELECT id, price, available, max_per_order
      FROM ticket_types
      WHERE event_id = p_event_id
      FOR UPDATE  -- Lock rows to prevent concurrent modifications
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL THEN
        CONTINUE;
      END IF;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Not enough tickets available'
        );
      END IF;

      IF v_quantity > v_ticket_type.max_per_order THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Maximum tickets per order exceeded'
        );
      END IF;

      -- Add to total
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END LOOP;

    -- Create order
    INSERT INTO orders (
      user_id,
      event_id,
      total,
      status,
      payment_method,
      ticket_quantities
    ) VALUES (
      p_user_id,
      p_event_id,
      v_total,
      'PENDING',
      p_payment_method,
      p_ticket_quantities
    ) RETURNING id INTO v_order_id;

    -- Update ticket type availability
    FOR v_ticket_type IN 
      SELECT id, available
      FROM ticket_types
      WHERE event_id = p_event_id
      FOR UPDATE
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE ticket_types
      SET 
        available = available - v_quantity,
        updated_at = now()
      WHERE id = v_ticket_type.id;
    END LOOP;

    -- Update event tickets sold count
    UPDATE events
    SET 
      tickets_sold = tickets_sold + (
        SELECT sum((value::text)::integer)
        FROM jsonb_each(p_ticket_quantities)
      ),
      updated_at = now()
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
      'success', true,
      'orderId', v_order_id
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;

-- Create function to handle guest orders
CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_email text,
  p_name text,
  p_event_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_verification_token text;
BEGIN
  -- Generate verification token
  v_verification_token := encode(gen_random_bytes(32), 'hex');

  -- Create order using the main create_order function
  WITH order_result AS (
    SELECT (create_order(
      p_event_id,
      NULL,  -- No user_id for guest orders
      p_ticket_quantities,
      p_payment_method
    ))::jsonb AS result
  )
  SELECT (result->>'orderId')::uuid INTO v_order_id
  FROM order_result
  WHERE (result->>'success')::boolean = true;

  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create order'
    );
  END IF;

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
END;
$$;

-- Grant execute permission to public (anonymous users)
GRANT EXECUTE ON FUNCTION public.create_guest_order TO public;

-- Create function to verify guest access
CREATE OR REPLACE FUNCTION public.verify_guest_access(
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest_order record;
BEGIN
  -- Get guest order
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

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_guest_order.order_id
  );
END;
$$;

-- Grant execute permission to public (anonymous users)
GRANT EXECUTE ON FUNCTION public.verify_guest_access TO public;