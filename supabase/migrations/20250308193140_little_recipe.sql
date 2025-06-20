/*
  # Order Processing Functions
  
  1. Changes
    - Fixed syntax error in create_tickets_for_order function
    - Improved ticket creation logic
    - Added proper error handling
    
  2. Functions
    - calculate_order_total: Calculates total price for order
    - create_tickets_for_order: Creates tickets without duplication
    - send_order_email: Sends confirmation email
*/

-- Calculate order total function
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
BEGIN
  -- Loop through ticket quantities JSON
  FOR v_ticket_type IN 
    SELECT tt.*, (q.value)::integer as qty
    FROM jsonb_each_text(NEW.ticket_quantities) q
    JOIN ticket_types tt ON tt.id = q.key::uuid
  LOOP
    -- Add to total if quantity is valid
    IF v_ticket_type.qty > 0 THEN
      v_total := v_total + (v_ticket_type.price * v_ticket_type.qty);
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
BEGIN
  -- Process each ticket type in the order
  FOR v_ticket_type IN 
    SELECT tt.*, (q.value)::integer as qty
    FROM jsonb_each_text(NEW.ticket_quantities) q
    JOIN ticket_types tt ON tt.id = q.key::uuid
  LOOP
    -- Skip if quantity is invalid
    IF v_ticket_type.qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Check availability
    IF v_ticket_type.available < v_ticket_type.qty THEN
      RAISE EXCEPTION 'Not enough tickets available for type %', v_ticket_type.id;
    END IF;

    -- Create tickets using generate_series to avoid duplicates
    INSERT INTO tickets (
      order_id,
      event_id,
      user_id,
      ticket_type_id,
      status,
      qr_code
    )
    SELECT
      NEW.id,
      NEW.event_id,
      NEW.user_id,
      v_ticket_type.id,
      'VALID',
      encode(
        digest(
          NEW.id::text || v_ticket_type.id::text || s::text || clock_timestamp()::text,
          'sha256'
        ),
        'hex'
      )
    FROM generate_series(1, v_ticket_type.qty) s;

    -- Update available tickets
    UPDATE ticket_types
    SET available = available - v_ticket_type.qty
    WHERE id = v_ticket_type.id;
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

-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS calculate_total_before_insert ON orders;
DROP TRIGGER IF EXISTS create_tickets_after_order ON orders;
DROP TRIGGER IF EXISTS send_order_email_trigger ON orders;

-- Create triggers
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