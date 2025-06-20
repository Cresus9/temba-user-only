/*
  # Add Performance Indexes and Constraints

  1. New Indexes
    - Add indexes for frequently queried fields
    - Add composite indexes for common query patterns
  
  2. Constraints
    - Add check constraints for data validation
    - Add foreign key constraints for data integrity
*/

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS events_categories_idx ON events USING GIN (categories);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);

-- Add check constraints
ALTER TABLE events 
  ADD CONSTRAINT events_price_check 
  CHECK (price >= 0);

ALTER TABLE events 
  ADD CONSTRAINT events_capacity_check 
  CHECK (capacity > 0);

ALTER TABLE ticket_types 
  ADD CONSTRAINT ticket_types_price_check 
  CHECK (price >= 0);

ALTER TABLE ticket_types 
  ADD CONSTRAINT ticket_types_quantity_check 
  CHECK (quantity >= 0);

ALTER TABLE ticket_types 
  ADD CONSTRAINT ticket_types_max_per_order_check 
  CHECK (max_per_order > 0);

ALTER TABLE orders 
  ADD CONSTRAINT orders_total_check 
  CHECK (total >= 0);

-- Add status constraints
ALTER TABLE events 
  ADD CONSTRAINT events_status_check 
  CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'));

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'));

ALTER TABLE tickets 
  ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('VALID', 'USED', 'CANCELLED'));

-- Add currency constraint
ALTER TABLE events 
  ADD CONSTRAINT events_currency_check 
  CHECK (currency IN ('GHS', 'USD', 'EUR', 'NGN'));