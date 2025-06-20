/*
  # Order Processing System

  1. Functions
    - calculate_order_total() - Calculates order total based on ticket quantities
    - create_tickets_for_order() - Creates tickets with proper quantity handling
    - send_order_email() - Sends order confirmation email

  2. Changes
    - Fixed duplicate ticket creation issue
    - Added better validation and error handling
    - Improved transaction handling
*/

-- Calculate order total function
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_ticket_type_id TEXT;
BEGIN
  -- Loop through ticket quantities JSON
  FOR v_ticket_type_id, v_quantity IN 
    SELECT * FROM jsonb_each_text(NEW.ticket_quantities)
  LOOP
    -- Skip if quantity is 0 or null
    CONTINUE WHEN v_quantity IS NULL OR v_quantity::integer <= 0;

    -- Get ticket type price
    SELECT price INTO v_ticket_type
    FROM ticket_types
    WHERE id = v_ticket_type_id::uuid;

    IF FOUND THEN
      v_total := v_total + (v_ticket_type.price * v_quantity::integer);
    END IF;
  END LOOP;

  -- Set the calculated total
  NEW.total := v_total;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create tickets for order function with fixed quantity handling
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_qr_code TEXT;
  v_ticket_type_id TEXT;
BEGIN
  -- Loop through ticket quantities
  FOR v_ticket_type_id, v_quantity IN 
    SELECT * FROM jsonb_each_text(NEW.ticket_quantities)
  LOOP
    -- Skip if quantity is 0 or null
    CONTINUE WHEN v_quantity IS NULL OR v_quantity::integer <= 0;

    -- Get ticket type details
    SELECT * INTO v_ticket_type
    FROM ticket_types
    WHERE id = v_ticket_type_id::uuid
    FOR UPDATE; -- Lock the row to prevent race conditions

    IF FOUND THEN
      -- Verify available tickets
      IF v_ticket_type.available < v_quantity::integer THEN
        RAISE EXCEPTION 'Not enough tickets available for type %', v_ticket_type_id;
      END IF;

      -- Update ticket type availability first
      UPDATE ticket_types
      SET available = available - v_quantity::integer
      WHERE id = v_ticket_type_id::uuid;

      -- Create exactly v_quantity tickets
      FOR i IN 1..v_quantity::integer LOOP
        -- Generate unique QR code using order ID, ticket type, sequence and timestamp
        v_qr_code := encode(
          digest(
            NEW.id::text || v_ticket_type_id || i::text || clock_timestamp()::text,
            'sha256'
          ),
          'hex'
        );
        
        -- Insert single ticket
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
          v_ticket_type_id::uuid,
          'VALID',
          v_qr_code
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Send order email function
CREATE OR REPLACE FUNCTION send_order_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via webhook
  PERFORM
    net.http_post(
      url := 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/order-email',
      body := json_build_object(
        'order_id', NEW.id
      )::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send order email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Drop existing triggers
DROP TRIGGER IF EXISTS calculate_total_before_insert ON orders;
DROP TRIGGER IF EXISTS create_tickets_after_order ON orders;
DROP TRIGGER IF EXISTS send_order_email_trigger ON orders;

-- Recreate triggers
CREATE TRIGGER calculate_total_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_total();

CREATE TRIGGER create_tickets_after_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_tickets_for_order();

CREATE TRIGGER send_order_email_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_order_email();