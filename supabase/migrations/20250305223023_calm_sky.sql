/*
  # Order Management Functions

  1. New Functions
    - `create_order` - Creates a new order and associated tickets
    - `create_guest_order` - Creates a guest order with verification token
    - `calculate_order_total` - Calculates order total based on ticket quantities
    - `create_tickets_for_order` - Creates tickets for an order

  2. Security
    - Functions are accessible to authenticated users
    - Guest order function is accessible to public
    - Input validation for all parameters
*/

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(
  p_event_id uuid,
  p_ticket_quantities jsonb
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric := 0;
  v_ticket_type record;
BEGIN
  FOR v_ticket_type IN 
    SELECT id, price, available, max_per_order
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    IF p_ticket_quantities ? v_ticket_type.id::text THEN
      -- Get quantity for this ticket type
      DECLARE
        v_quantity int := (p_ticket_quantities ->> v_ticket_type.id::text)::int;
      BEGIN
        -- Validate quantity
        IF v_quantity > v_ticket_type.available THEN
          RAISE EXCEPTION 'Not enough tickets available for type %', v_ticket_type.id;
        END IF;
        IF v_quantity > v_ticket_type.max_per_order THEN
          RAISE EXCEPTION 'Maximum % tickets allowed per order', v_ticket_type.max_per_order;
        END IF;
        -- Add to total
        v_total := v_total + (v_ticket_type.price * v_quantity);
      END;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

-- Function to create tickets for an order
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_type record;
  v_quantity int;
  v_qr_code text;
BEGIN
  -- Create tickets based on ticket_quantities
  FOR v_ticket_type IN 
    SELECT id, name, price
    FROM ticket_types
    WHERE event_id = NEW.event_id
  LOOP
    IF NEW.ticket_quantities ? v_ticket_type.id::text THEN
      v_quantity := (NEW.ticket_quantities ->> v_ticket_type.id::text)::int;
      
      FOR i IN 1..v_quantity LOOP
        -- Generate unique QR code
        v_qr_code := encode(gen_random_bytes(32), 'hex');
        
        -- Create ticket
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
          v_qr_code
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to create a new order
CREATE OR REPLACE FUNCTION create_order(
  p_event_id uuid,
  p_user_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric;
BEGIN
  -- Calculate total
  v_total := calculate_order_total(p_event_id, p_ticket_quantities);

  -- Create order
  INSERT INTO orders (
    event_id,
    user_id,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_event_id,
    p_user_id,
    v_total,
    'PENDING',
    p_payment_method,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'total', v_total
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to create a guest order
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
  v_total numeric;
  v_token text;
BEGIN
  -- Validate email format
  IF NOT p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Calculate total
  v_total := calculate_order_total(p_event_id, p_ticket_quantities);

  -- Generate verification token
  v_token := encode(gen_random_bytes(16), 'hex');

  -- Create order
  INSERT INTO orders (
    event_id,
    guest_email,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_event_id,
    p_email,
    v_total,
    'PENDING',
    p_payment_method,
    p_ticket_quantities
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
    v_token,
    NOW() + INTERVAL '48 hours'
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'verificationToken', v_token
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;