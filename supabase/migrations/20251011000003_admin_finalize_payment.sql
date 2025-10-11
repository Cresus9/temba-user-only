-- Create idempotent payment finalization function
-- This function is called by verify-payment to finalize payments and create tickets
-- It's idempotent: safe to call multiple times, won't duplicate tickets

CREATE OR REPLACE FUNCTION admin_finalize_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_order RECORD;
  v_ticket_type_id TEXT;
  v_quantity INT;
  v_tickets_created INT := 0;
  v_tickets_existed INT := 0;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment not found'
    );
  END IF;

  -- Update payment status if not already completed
  IF v_payment.status != 'completed' AND v_payment.status != 'succeeded' THEN
    UPDATE payments
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    RAISE NOTICE 'Payment % marked as completed', p_payment_id;
  END IF;

  -- If no order_id, we can't create tickets
  IF v_payment.order_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment completed but no order_id to create tickets',
      'payment_id', p_payment_id
    );
  END IF;

  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = v_payment.order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- Update order status if not already completed
  IF v_order.status != 'COMPLETED' THEN
    UPDATE orders
    SET status = 'COMPLETED',
        updated_at = NOW()
    WHERE id = v_payment.order_id;
    
    RAISE NOTICE 'Order % marked as COMPLETED', v_payment.order_id;
  END IF;

  -- Check if tickets already exist (idempotency check)
  SELECT COUNT(*) INTO v_tickets_existed
  FROM tickets
  WHERE order_id = v_payment.order_id;

  IF v_tickets_existed > 0 THEN
    RAISE NOTICE 'Tickets already exist for order % (% tickets)', v_payment.order_id, v_tickets_existed;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Tickets already exist',
      'payment_id', p_payment_id,
      'order_id', v_payment.order_id,
      'tickets_count', v_tickets_existed
    );
  END IF;

  -- Create tickets from order.ticket_quantities
  IF v_order.ticket_quantities IS NOT NULL THEN
    FOR v_ticket_type_id, v_quantity IN
      SELECT key::TEXT, value::TEXT::INT
      FROM jsonb_each_text(v_order.ticket_quantities)
    LOOP
      RAISE NOTICE 'Creating % tickets of type %', v_quantity, v_ticket_type_id;
      
      -- Insert tickets for this type
      FOR i IN 1..v_quantity LOOP
        INSERT INTO tickets (
          order_id,
          event_id,
          user_id,
          ticket_type_id,
          status,
          payment_status,
          payment_id,
          created_at
        ) VALUES (
          v_payment.order_id,
          v_order.event_id,
          v_order.user_id,
          v_ticket_type_id::UUID,
          'VALID',
          'paid',
          p_payment_id,
          NOW()
        );
        
        v_tickets_created := v_tickets_created + 1;
      END LOOP;
    END LOOP;

    RAISE NOTICE 'Successfully created % tickets for order %', v_tickets_created, v_payment.order_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment finalized and tickets created',
      'payment_id', p_payment_id,
      'order_id', v_payment.order_id,
      'tickets_created', v_tickets_created
    );
  ELSE
    -- No ticket_quantities in order
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Payment completed but order has no ticket_quantities',
      'payment_id', p_payment_id,
      'order_id', v_payment.order_id
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in admin_finalize_payment: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION admin_finalize_payment(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION admin_finalize_payment IS 'Idempotently finalizes a payment and creates tickets. Safe to call multiple times.';

