/*
  # Order and Ticket Creation Functions

  1. New Functions
    - `create_order` - Creates an order and associated tickets
    - `create_guest_order` - Creates an order and tickets for guest users
    - `create_tickets_for_order` - Helper function to create tickets for an order
    - `calculate_order_total` - Calculates the total amount for an order

  2. Security
    - Functions are accessible to authenticated users and public for guest orders
    - Proper validation and error handling
    - Transaction management for data consistency

  3. Changes
    - Added proper parameter handling
    - Added ticket creation logic
    - Added guest order support
*/

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total numeric := 0;
  v_ticket_type record;
BEGIN
  -- Calculate total from ticket quantities
  FOR v_ticket_type IN 
    SELECT tt.id, tt.price, (NEW.ticket_quantities->tt.id::text)::integer as quantity
    FROM ticket_types tt
    WHERE tt.id::text = ANY(array(SELECT jsonb_object_keys(NEW.ticket_quantities)))
  LOOP
    v_total := v_total + (v_ticket_type.price * v_ticket_type.quantity);
  END LOOP;

  -- Add processing fee (2%)
  NEW.total := v_total * 1.02;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create tickets for an order
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_type record;
  v_quantity integer;
  v_i integer;
BEGIN
  -- Create tickets based on quantities
  FOR v_ticket_type IN 
    SELECT tt.id, tt.price, (NEW.ticket_quantities->tt.id::text)::integer as quantity
    FROM ticket_types tt
    WHERE tt.id::text = ANY(array(SELECT jsonb_object_keys(NEW.ticket_quantities)))
  LOOP
    v_quantity := v_ticket_type.quantity;
    
    -- Create specified number of tickets
    FOR v_i IN 1..v_quantity LOOP
      INSERT INTO tickets (
        order_id,
        event_id,
        user_id,
        ticket_type_id,
        status,
        qr_code
      ) VALUES (
        NEW.id,
        NEW.event_id,
        NEW.user_id,
        v_ticket_type.id,
        'VALID',
        encode(gen_random_bytes(32), 'hex')
      );
    END LOOP;

    -- Update ticket type availability
    UPDATE ticket_types
    SET available = available - v_quantity
    WHERE id = v_ticket_type.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create an order
CREATE OR REPLACE FUNCTION create_order(
  p_event_id uuid,
  p_user_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_event_title text;
BEGIN
  -- Validate event exists and is published
  SELECT title INTO v_event_title
  FROM events
  WHERE id = p_event_id AND status = 'PUBLISHED';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found or not available'
    );
  END IF;

  -- Create order
  INSERT INTO orders (
    event_id,
    user_id,
    ticket_quantities,
    payment_method,
    status
  ) VALUES (
    p_event_id,
    p_user_id,
    p_ticket_quantities,
    p_payment_method,
    'PENDING'
  ) RETURNING id INTO v_order_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'eventTitle', v_event_title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a guest order
CREATE OR REPLACE FUNCTION create_guest_order(
  p_email text,
  p_name text,
  p_event_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
)
RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_event_title text;
  v_verification_token text;
BEGIN
  -- Validate event exists and is published
  SELECT title INTO v_event_title
  FROM events
  WHERE id = p_event_id AND status = 'PUBLISHED';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found or not available'
    );
  END IF;

  -- Generate verification token
  v_verification_token := encode(gen_random_bytes(16), 'hex');

  -- Create order
  INSERT INTO orders (
    event_id,
    guest_email,
    ticket_quantities,
    payment_method,
    status
  ) VALUES (
    p_event_id,
    p_email,
    p_ticket_quantities,
    p_payment_method,
    'PENDING'
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
    NOW() + INTERVAL '48 hours'
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'verificationToken', v_verification_token,
    'eventTitle', v_event_title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify guest access
CREATE OR REPLACE FUNCTION verify_guest_access(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_guest_order record;
  v_order record;
BEGIN
  -- Get guest order
  SELECT go.*, o.status as order_status, e.title as event_title
  INTO v_guest_order
  FROM guest_orders go
  JOIN orders o ON o.id = go.order_id
  JOIN events e ON e.id = o.event_id
  WHERE go.verification_token = p_token
    AND go.token_expires_at > NOW()
    AND NOT go.verified;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;

  -- Mark as verified
  UPDATE guest_orders
  SET verified = true
  WHERE order_id = v_guest_order.order_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'email', v_guest_order.email,
    'orderId', v_guest_order.order_id,
    'eventTitle', v_guest_order.event_title,
    'orderStatus', v_guest_order.order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers
DROP TRIGGER IF EXISTS calculate_total_before_insert ON orders;
CREATE TRIGGER calculate_total_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_total();

DROP TRIGGER IF EXISTS create_tickets_after_order ON orders;
CREATE TRIGGER create_tickets_after_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_tickets_for_order();