-- ===================================================================
-- MANUALLY COMPLETE STRIPE PAYMENT AND CREATE TICKETS
-- ===================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- Replace the payment_id with your actual payment ID

-- Payment ID from your logs
-- f4a97030-99b1-427a-9a8f-a1ae83480b87

BEGIN;

-- Step 1: Update payment status to completed
UPDATE public.payments
SET 
  status = 'completed',
  completed_at = NOW(),
  amount_paid = charge_amount_minor / 100.0,
  updated_at = NOW()
WHERE id = 'f4a97030-99b1-427a-9a8f-a1ae83480b87'
  AND status = 'pending';

-- Step 2: Get order details
DO $$
DECLARE
  v_order_id UUID;
  v_event_id UUID;
  v_user_id UUID;
  v_ticket_quantities JSONB;
  v_ticket_type_id TEXT;
  v_quantity INT;
BEGIN
  -- Get order information
  SELECT order_id, event_id, user_id
  INTO v_order_id, v_event_id, v_user_id
  FROM public.payments
  WHERE id = 'f4a97030-99b1-427a-9a8f-a1ae83480b87';

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Payment does not have an order_id';
  END IF;

  -- Get ticket quantities from order
  SELECT ticket_quantities
  INTO v_ticket_quantities
  FROM public.orders
  WHERE id = v_order_id;

  IF v_ticket_quantities IS NULL THEN
    RAISE EXCEPTION 'Order does not have ticket_quantities';
  END IF;

  -- Update order status
  UPDATE public.orders
  SET 
    status = 'COMPLETED',
    updated_at = NOW()
  WHERE id = v_order_id;

  RAISE NOTICE 'Order % marked as COMPLETED', v_order_id;

  -- Create tickets for each ticket type
  FOR v_ticket_type_id, v_quantity IN 
    SELECT key::TEXT, value::TEXT::INT
    FROM jsonb_each_text(v_ticket_quantities)
  LOOP
    RAISE NOTICE 'Creating % tickets of type %', v_quantity, v_ticket_type_id;
    
    -- Insert tickets
    FOR i IN 1..v_quantity LOOP
      INSERT INTO public.tickets (
        order_id,
        event_id,
        user_id,
        ticket_type_id,
        status,
        payment_status,
        payment_id,
        created_at
      ) VALUES (
        v_order_id,
        v_event_id,
        v_user_id,
        v_ticket_type_id::UUID,
        'VALID',
        'paid',
        'f4a97030-99b1-427a-9a8f-a1ae83480b87'::UUID,
        NOW()
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Tickets created successfully for order %', v_order_id;
END $$;

COMMIT;

-- Verify the results
SELECT 
  'Payment Status' as check_type,
  status,
  completed_at,
  amount_paid
FROM public.payments
WHERE id = 'f4a97030-99b1-427a-9a8f-a1ae83480b87';

SELECT 
  'Order Status' as check_type,
  o.status,
  (SELECT COUNT(*) FROM tickets WHERE order_id = o.id) as ticket_count
FROM public.orders o
JOIN public.payments p ON p.order_id = o.id
WHERE p.id = 'f4a97030-99b1-427a-9a8f-a1ae83480b87';

SELECT 
  'Created Tickets' as check_type,
  t.id as ticket_id,
  t.status,
  t.payment_status,
  tt.name as ticket_type_name
FROM public.tickets t
JOIN public.ticket_types tt ON t.ticket_type_id = tt.id
WHERE t.payment_id = 'f4a97030-99b1-427a-9a8f-a1ae83480b87';

