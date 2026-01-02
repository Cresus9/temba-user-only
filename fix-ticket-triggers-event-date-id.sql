-- Fix all ticket creation triggers to include event_date_id from order
-- Run this directly in Supabase SQL Editor
-- This script is idempotent - safe to run multiple times

-- Step 1: Fix create_tickets_for_order() function
-- This unified version handles both jsonb_array_elements and jsonb_each_text formats
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_type_id TEXT;
  v_quantity INTEGER;
  v_ticket_type RECORD;
  i INTEGER;
  v_qr_code TEXT;
BEGIN
  -- Try jsonb_each_text format first (most common in recent migrations)
  BEGIN
    FOR v_ticket_type_id, v_quantity IN 
      SELECT * FROM jsonb_each_text(NEW.ticket_quantities)
    LOOP
      -- Get ticket type details
      SELECT * INTO v_ticket_type
      FROM ticket_types
      WHERE id = v_ticket_type_id::uuid;

      IF FOUND THEN
        -- Create tickets
        FOR i IN 1..v_quantity::integer LOOP
          -- Generate unique QR code
          v_qr_code := encode(digest(NEW.id::text || v_ticket_type_id || i::text || now()::text, 'sha256'), 'hex');
          
          -- Insert ticket with event_date_id
          INSERT INTO tickets (
            order_id,
            event_id,
            event_date_id,  -- ✅ NEW: Include event_date_id from order
            user_id,
            ticket_type_id,
            status,
            qr_code
          ) VALUES (
            NEW.id,
            NEW.event_id,
            NEW.event_date_id,  -- ✅ Use event_date_id from order
            NEW.user_id,
            v_ticket_type_id::uuid,
            'VALID',
            v_qr_code
          );

          -- Update ticket type availability (if column exists)
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ticket_types' 
            AND column_name = 'available'
          ) THEN
            UPDATE ticket_types
            SET available = available - 1
            WHERE id = v_ticket_type_id::uuid;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to jsonb_array_elements format if jsonb_each_text fails
      -- This handles the alternative format used in some migrations
      FOR v_ticket_type IN 
        SELECT 
          tt.id as ticket_type_id,
          (elem->>'quantity')::integer as quantity
        FROM jsonb_array_elements(NEW.ticket_quantities) as elem
        JOIN ticket_types tt ON tt.id = (elem->>'ticket_type_id')::uuid
        WHERE tt.event_id = NEW.event_id
      LOOP
        FOR i IN 1..v_ticket_type.quantity LOOP
          INSERT INTO tickets (
            order_id,
            event_id,
            event_date_id,  -- ✅ NEW: Include event_date_id from order
            user_id,
            ticket_type_id,
            status,
            qr_code
          ) VALUES (
            NEW.id,
            NEW.event_id,
            NEW.event_date_id,  -- ✅ Use event_date_id from order
            NEW.user_id,
            v_ticket_type.ticket_type_id,
            'VALID',
            encode(gen_random_bytes(32), 'hex')
          );
        END LOOP;
        
        -- Update available tickets count (if column exists)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'ticket_types' 
          AND column_name = 'available'
        ) THEN
          UPDATE ticket_types
          SET available = available - v_ticket_type.quantity
          WHERE id = v_ticket_type.ticket_type_id;
        END IF;
      END LOOP;
      
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Verify the function was updated correctly
DO $$
DECLARE
  v_function_def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_function_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'create_tickets_for_order'
  LIMIT 1;
  
  IF v_function_def LIKE '%event_date_id%' THEN
    RAISE NOTICE '✅ Function create_tickets_for_order() includes event_date_id';
  ELSE
    RAISE WARNING '⚠️ Function create_tickets_for_order() may not include event_date_id';
  END IF;
END $$;

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION create_tickets_for_order() IS 'Creates tickets for an order when it is inserted. Includes event_date_id from the order for multi-date events.';

-- Step 5: Verify trigger exists and is active
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  CASE 
    WHEN action_statement LIKE '%create_tickets_for_order%' THEN '✅ Trigger uses create_tickets_for_order()'
    ELSE '❌ Unknown function'
  END as status
FROM information_schema.triggers
WHERE event_object_table = 'orders'
  AND trigger_name LIKE '%ticket%'
ORDER BY trigger_name;

