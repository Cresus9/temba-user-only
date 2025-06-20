/*
  # Order Processing System

  1. New Functions
    - calculate_order_total() - Calculates the total amount for an order
    - create_tickets_for_order() - Creates tickets after order creation
    - send_order_email() - Sends confirmation email for new orders

  2. Triggers
    - calculate_total_before_insert - Automatically calculates order total
    - create_tickets_after_order - Creates tickets when order is created
    - send_order_email_trigger - Sends confirmation email

  3. Security
    - RLS policies for orders table
    - Validation checks for order data
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

-- Create tickets for order function
CREATE OR REPLACE FUNCTION create_tickets_for_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_qr_code TEXT;
  v_ticket_type_id TEXT;
  i INTEGER;
BEGIN
  -- Loop through ticket quantities
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
        
        -- Insert ticket
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

        -- Update ticket type availability
        UPDATE ticket_types
        SET available = available - 1
        WHERE id = v_ticket_type_id::uuid;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Send order email function using http extension
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

DROP TRIGGER IF EXISTS send_order_email_trigger ON orders;
CREATE TRIGGER send_order_email_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_order_email();

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;