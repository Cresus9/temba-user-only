/*
  # Update Guest Orders System

  1. Changes
    - Add phone number field
    - Create direct guest order function
    - Update RLS policies

  2. Security
    - Enable RLS on guest_orders table
    - Add policies for guest access
    - Secure function execution
*/

-- First drop dependent policies
DROP POLICY IF EXISTS guest_orders_select_policy ON guest_orders;
DROP POLICY IF EXISTS guest_orders_update_policy ON guest_orders;
DROP POLICY IF EXISTS guest_orders_insert_policy ON guest_orders;

-- Update guest_orders table
ALTER TABLE guest_orders 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create function to create guest orders directly
CREATE OR REPLACE FUNCTION create_guest_order_direct(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_event_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  v_ticket_type_id UUID;
  v_quantity INT;
  v_price NUMERIC;
BEGIN
  -- Calculate total and validate quantities
  FOR v_ticket_type_id, v_quantity IN SELECT * FROM jsonb_each(p_ticket_quantities)
  LOOP
    SELECT price INTO v_price FROM ticket_types WHERE id = v_ticket_type_id::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid ticket type: %', v_ticket_type_id;
    END IF;
    v_total := v_total + (v_price * v_quantity::INT);
  END LOOP;

  -- Create order with guest_email
  INSERT INTO orders (
    event_id,
    guest_email,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_event_id,
    p_email,
    v_total,
    'COMPLETED',
    p_payment_method,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Create guest order record
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    phone
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    p_phone
  );

  -- Create tickets
  PERFORM create_tickets_for_order(v_order_id);

  -- Send confirmation email
  PERFORM send_order_email(v_order_id);

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_orders_select_policy ON guest_orders
  FOR SELECT TO public
  USING (
    email = current_user OR 
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = guest_orders.order_id 
      AND o.guest_email = email
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY guest_orders_insert_policy ON guest_orders
  FOR INSERT TO public
  WITH CHECK (true);

-- Function to link guest orders to user on signup
CREATE OR REPLACE FUNCTION link_guest_orders_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Update orders
  UPDATE orders
  SET user_id = NEW.id, guest_email = NULL
  WHERE guest_email = NEW.email;

  -- Update tickets
  UPDATE tickets
  SET user_id = NEW.id
  WHERE order_id IN (
    SELECT order_id 
    FROM guest_orders 
    WHERE email = NEW.email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS link_guest_orders_after_signup ON auth.users;

-- Create trigger to link guest orders on signup
CREATE TRIGGER link_guest_orders_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_guest_orders_on_signup();