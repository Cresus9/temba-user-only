-- Fix orders table constraints and fields
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Ensure orders total has a default value
ALTER TABLE orders ALTER COLUMN total SET DEFAULT 0;

-- Add missing ticket_type_id field to tickets table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'ticket_type_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN ticket_type_id uuid REFERENCES ticket_types(id);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON tickets(ticket_type_id);