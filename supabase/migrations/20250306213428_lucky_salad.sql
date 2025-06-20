/*
  # Debug Create Order Function

  1. Verify Schema Cache
    - Notify PostgREST to reload schema
    - Drop and recreate function with proper parameter handling

  2. Changes
    - Add debug logging
    - Ensure proper parameter order and types
    - Verify function exists in schema
*/

-- First, notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_order(uuid, uuid, jsonb, text);

-- Recreate the function with explicit parameter names
CREATE OR REPLACE FUNCTION public.create_order(
  p_event_id uuid,
  p_user_id uuid,
  p_ticket_quantities jsonb,
  p_payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric := 0;
  v_ticket_type record;
  v_quantity integer;
  v_event record;
BEGIN
  -- Log function entry for debugging
  RAISE NOTICE 'Creating order: event_id=%, user_id=%, payment_method=%', 
    p_event_id, p_user_id, p_payment_method;
  RAISE NOTICE 'Ticket quantities: %', p_ticket_quantities;

  -- Validate event exists and is published
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id AND status = 'PUBLISHED'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'Event not found or not published: %', p_event_id;
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
      FOR UPDATE
    LOOP
      v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
      
      IF v_quantity IS NULL THEN
        CONTINUE;
      END IF;

      RAISE NOTICE 'Processing ticket type: id=%, quantity=%, available=%',
        v_ticket_type.id, v_quantity, v_ticket_type.available;

      -- Validate quantity
      IF v_quantity > v_ticket_type.available THEN
        RAISE NOTICE 'Not enough tickets available for type: %', v_ticket_type.id;
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Not enough tickets available for type %s', v_ticket_type.id)
        );
      END IF;

      IF v_quantity > v_ticket_type.max_per_order THEN
        RAISE NOTICE 'Max per order exceeded for type: %', v_ticket_type.id;
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Maximum %s tickets allowed per order', v_ticket_type.max_per_order)
        );
      END IF;

      -- Add to total
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END LOOP;

    RAISE NOTICE 'Total calculated: %', v_total;

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

    RAISE NOTICE 'Order created: %', v_order_id;

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

      RAISE NOTICE 'Updated availability for ticket type %: reduced by %',
        v_ticket_type.id, v_quantity;
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

    RAISE NOTICE 'Order creation completed successfully';

    RETURN jsonb_build_object(
      'success', true,
      'orderId', v_order_id
    );

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating order: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;

-- Verify function exists and has correct parameters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'create_order'
  ) THEN
    RAISE EXCEPTION 'Function create_order does not exist';
  END IF;

  -- Log function details for verification
  RAISE NOTICE 'Function details:';
  RAISE NOTICE '%', (
    SELECT pg_get_functiondef(oid)
    FROM pg_proc
    WHERE proname = 'create_order'
    AND pronamespace = 'public'::regnamespace
  );
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;

-- Verify permissions
DO $$
BEGIN
  RAISE NOTICE 'Verifying permissions...';
  RAISE NOTICE '%', (
    SELECT array_agg(privilege_type)
    FROM information_schema.routine_privileges
    WHERE routine_name = 'create_order'
    AND grantee = 'authenticated'
  );
END $$;