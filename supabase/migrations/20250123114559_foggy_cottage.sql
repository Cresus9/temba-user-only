-- Drop existing views if they exist
DROP VIEW IF EXISTS order_details;
DROP VIEW IF EXISTS ticket_details;

-- Create improved view for order details
CREATE OR REPLACE VIEW order_details AS
WITH ticket_summary AS (
  SELECT 
    t.order_id,
    COUNT(*) as ticket_count,
    json_agg(
      json_build_object(
        'id', t.id,
        'ticket_type_name', tt.name,
        'ticket_type_price', tt.price
      )
    ) as tickets
  FROM tickets t
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  GROUP BY t.order_id
)
SELECT 
  o.id,
  o.user_id,
  o.event_id,
  o.total,
  o.status,
  o.payment_method,
  o.created_at,
  o.updated_at,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.currency as event_currency,
  p.name as user_name,
  p.email as user_email,
  COALESCE(ts.ticket_count, 0) as ticket_count,
  COALESCE(ts.tickets, '[]'::json) as tickets
FROM orders o
LEFT JOIN events e ON e.id = o.event_id
LEFT JOIN profiles p ON p.user_id = o.user_id
LEFT JOIN ticket_summary ts ON ts.order_id = o.id;

-- Add ticket quantities column to orders if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_quantities jsonb;

-- Create function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  total_amount numeric := 0;
  ticket_type RECORD;
BEGIN
  -- Calculate total based on ticket quantities and prices
  FOR ticket_type IN 
    SELECT 
      tt.price,
      (elem->>'quantity')::integer as quantity
    FROM jsonb_array_elements(NEW.ticket_quantities) as elem
    JOIN ticket_types tt ON tt.id = (elem->>'ticket_type_id')::uuid
    WHERE tt.event_id = NEW.event_id
  LOOP
    total_amount := total_amount + (ticket_type.price * ticket_type.quantity);
  END LOOP;
  
  -- Add processing fee
  NEW.total := total_amount + (total_amount * 0.02); -- 2% processing fee
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic total calculation
DROP TRIGGER IF EXISTS calculate_total_before_insert ON orders;
CREATE TRIGGER calculate_total_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_total();

-- Create function to handle ticket creation
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
        user_id,
        ticket_type_id,
        status,
        qr_code
      ) VALUES (
        NEW.id,
        NEW.event_id,
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

-- Create trigger for automatic ticket creation
DROP TRIGGER IF EXISTS create_tickets_after_order ON orders;
CREATE TRIGGER create_tickets_after_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_tickets_for_order();