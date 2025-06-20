/*
  # Event Management Schema

  1. New Tables
    - events
    - ticket_types

  2. Security
    - Enable RLS
    - Add policies for access control
*/

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  location text NOT NULL,
  image_url text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'GHS',
  capacity integer NOT NULL CHECK (capacity > 0),
  tickets_sold integer DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')),
  featured boolean DEFAULT false,
  categories text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ticket Types Table
CREATE TABLE IF NOT EXISTS ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL CHECK (quantity >= 0),
  available integer NOT NULL CHECK (available >= 0),
  max_per_order integer NOT NULL CHECK (max_per_order > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "Anyone can view ticket types for published events" ON ticket_types;
DROP POLICY IF EXISTS "Admins can manage ticket types" ON ticket_types;

-- Event Policies
CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (status = 'PUBLISHED');

CREATE POLICY "Admins can manage all events"
  ON events FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role = 'ADMIN'
    )
  );

-- Ticket Type Policies
CREATE POLICY "Anyone can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "Admins can manage ticket types"
  ON ticket_types FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role = 'ADMIN'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
CREATE INDEX IF NOT EXISTS events_categories_idx ON events USING GIN (categories);
CREATE INDEX IF NOT EXISTS ticket_types_event_id_idx ON ticket_types(event_id);

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_ticket_types_updated_at ON ticket_types;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();