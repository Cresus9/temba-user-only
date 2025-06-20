-- Drop existing function
DROP FUNCTION IF EXISTS create_order;

-- Create improved order creation function with UUID for QR codes
CREATE OR REPLACE FUNCTION create_order(
  p_event_id UUID,
  p_user_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_ticket_type RECORD;
  v_total NUMERIC := 0;
  v_available INTEGER;
  v_quantity INTEGER;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Verify event exists and is published
    IF NOT EXISTS (
      SELECT 1 FROM events 
      WHERE id = p_event_id 
      AND status = 'PUBLISHED'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Event not found or not available'
      );
    END IF;

    -- Create order
    INSERT INTO orders (
      event_id,
      user_id,
      total,
      status,
      payment_method
    ) VALUES (
      p_event_id,
      p_user_id,
      0, -- Will update this later
      'PENDING',
      p_payment_method
    ) RETURNING id INTO v_order_id;

    -- Process each ticket type
    FOR v_ticket_type IN 
      SELECT tt.id, tt.price, tt.available, tt.max_per_order
      FROM ticket_types tt
      WHERE tt.event_id = p_event_id
      FOR UPDATE
    LOOP
      -- Get requested quantity
      v_quantity := COALESCE((p_ticket_quantities->>(v_ticket_type.id::text))::integer, 0);
      
      IF v_quantity = 0 THEN
        CONTINUE;
      END IF;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Not enough tickets available for type %s', v_ticket_type.id)
        );
      END IF;

      IF v_quantity > v_ticket_type.max_per_order THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Maximum %s tickets allowed per order for type %s', 
            v_ticket_type.max_per_order, v_ticket_type.id)
        );
      END IF;

      -- Create tickets with UUID-based QR codes
      FOR i IN 1..v_quantity LOOP
        INSERT INTO tickets (
          order_id,
          event_id,
          user_id,
          ticket_type_id,
          status,
          qr_code
        ) VALUES (
          v_order_id,
          p_event_id,
          p_user_id,
          v_ticket_type.id,
          'VALID',
          gen_random_uuid()::text -- Use UUID instead of gen_random_bytes
        );
      END LOOP;

      -- Update available tickets
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;

      -- Add to total
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END LOOP;

    -- Verify at least one ticket was ordered
    IF v_total = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No valid tickets selected'
      );
    END IF;

    -- Update order total with processing fee
    UPDATE orders
    SET 
      total = v_total + (v_total * 0.02), -- Add 2% processing fee
      updated_at = now()
    WHERE id = v_order_id;

    -- Update event tickets sold count
    UPDATE events
    SET 
      tickets_sold = tickets_sold + (
        SELECT COUNT(*)
        FROM tickets
        WHERE order_id = v_order_id
      ),
      updated_at = now()
    WHERE id = p_event_id;

    -- Create notification for order confirmation
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    ) VALUES (
      p_user_id,
      'Order Confirmation',
      'Your order has been created. Please complete the payment.',
      'ORDER_CREATED',
      jsonb_build_object(
        'orderId', v_order_id,
        'eventId', p_event_id,
        'total', v_total,
        'ticketCount', (SELECT COUNT(*) FROM tickets WHERE order_id = v_order_id)
      )
    );

    -- Return success response
    RETURN jsonb_build_object(
      'success', true,
      'orderId', v_order_id,
      'total', v_total + (v_total * 0.02),
      'ticketCount', (SELECT COUNT(*) FROM tickets WHERE order_id = v_order_id)
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error response
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Enable RPC access
GRANT EXECUTE ON FUNCTION create_order TO authenticated;

-- Add comment for API documentation
COMMENT ON FUNCTION create_order IS 'Creates a new order with tickets and handles inventory management';