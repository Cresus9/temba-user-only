-- Drop existing foreign key constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Add new foreign key constraint referencing auth.users
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Update orders table to ensure total is set
ALTER TABLE orders ALTER COLUMN total SET DEFAULT 0;

-- Add trigger to update total based on ticket prices
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total = (
    SELECT COALESCE(SUM(tt.price), 0)
    FROM ticket_types tt
    WHERE tt.id = NEW.ticket_type_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_total();