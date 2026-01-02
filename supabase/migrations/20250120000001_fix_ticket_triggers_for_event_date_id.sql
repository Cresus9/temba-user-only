/*
  # Fix Ticket Creation Triggers to Include event_date_id

  This migration updates all database triggers that automatically create tickets
  to ensure they include event_date_id from the order.
*/

-- Fix create_tickets_for_order function
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER AS $$
DECLARE
  ticket_data record;
  i integer;
BEGIN
  -- For each ticket type in the order
  FOR ticket_data IN 
    SELECT 
      tt.id as ticket_type_id,
      (elem->>'quantity')::integer as quantity
    FROM jsonb_array_elements(NEW.ticket_quantities) as elem
    JOIN ticket_types tt ON tt.id = (elem->>'ticket_type_id')::uuid
    WHERE tt.event_id = NEW.event_id
  LOOP
    -- Create the specified number of tickets
    FOR i IN 1..ticket_data.quantity LOOP
      INSERT INTO tickets (
        order_id,
        event_id,
        event_date_id,  -- NEW: Include event_date_id from order
        user_id,
        ticket_type_id,
        status,
        qr_code
      ) VALUES (
        NEW.id,
        NEW.event_id,
        NEW.event_date_id,  -- NEW: Use event_date_id from order
        NEW.user_id,
        ticket_data.ticket_type_id,
        'VALID',
        encode(gen_random_bytes(32), 'hex')
      );
    END LOOP;
    
    -- Update available tickets count
    UPDATE ticket_types
    SET available = available - ticket_data.quantity
    WHERE id = ticket_data.ticket_type_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger itself doesn't need to be recreated if it already exists
-- It will automatically use the updated function

-- Fix any other ticket creation functions that might exist
-- Check for function that creates tickets on order completion
DO $$
BEGIN
  -- Update function if it exists (check by trying to replace)
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'create_tickets_on_order_complete'
  ) THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION create_tickets_on_order_complete()
    RETURNS TRIGGER AS $func$
    DECLARE
      ticket_data record;
      i integer;
    BEGIN
      IF NEW.status = ''COMPLETED'' AND (OLD.status IS NULL OR OLD.status != ''COMPLETED'') THEN
        FOR ticket_data IN 
          SELECT 
            tt.id as ticket_type_id,
            (elem->>''quantity'')::integer as quantity
          FROM jsonb_array_elements(NEW.ticket_quantities) as elem
          JOIN ticket_types tt ON tt.id = (elem->>''ticket_type_id'')::uuid
          WHERE tt.event_id = NEW.event_id
        LOOP
          FOR i IN 1..ticket_data.quantity LOOP
            INSERT INTO tickets (
              order_id,
              event_id,
              event_date_id,
              user_id,
              ticket_type_id,
              status,
              qr_code
            ) VALUES (
              NEW.id,
              NEW.event_id,
              NEW.event_date_id,
              NEW.user_id,
              ticket_data.ticket_type_id,
              ''VALID'',
              encode(gen_random_bytes(32), ''hex'')
            );
          END LOOP;
        END LOOP;
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    ';
    RAISE NOTICE 'Updated create_tickets_on_order_complete function';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION create_tickets_for_order() IS 'Creates tickets for an order, including event_date_id for multi-date events';


