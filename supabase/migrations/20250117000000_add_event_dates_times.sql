/*
  # Add Multiple Event Dates Support

  1. New Tables
    - event_dates_times: Store multiple dates/times for events

  2. Changes
    - Add event_date_id to orders table
    - Add event_date_id to tickets table

  3. Security
    - Enable RLS on event_dates_times
    - Add policies for access control
*/

-- Event Dates Times Table
CREATE TABLE IF NOT EXISTS event_dates_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text,
  capacity_override integer,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'SOLD_OUT')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add event_date_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_date_id uuid REFERENCES event_dates_times(id) ON DELETE SET NULL;

-- Add event_date_id to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS event_date_id uuid REFERENCES event_dates_times(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_dates_times_event_id ON event_dates_times(event_id);
CREATE INDEX IF NOT EXISTS idx_event_dates_times_date ON event_dates_times(date);
CREATE INDEX IF NOT EXISTS idx_orders_event_date_id ON orders(event_date_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_date_id ON tickets(event_date_id);

-- Enable RLS
ALTER TABLE event_dates_times ENABLE ROW LEVEL SECURITY;

-- Policies for event_dates_times
DROP POLICY IF EXISTS "Anyone can view active event dates" ON event_dates_times;
CREATE POLICY "Anyone can view active event dates"
  ON event_dates_times FOR SELECT
  USING (
    status = 'ACTIVE' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_dates_times.event_id
      AND events.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Admins can manage event dates" ON event_dates_times;
CREATE POLICY "Admins can manage event dates"
  ON event_dates_times FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ORGANIZER')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE event_dates_times IS 'Stores multiple dates and times for events that span multiple days';
COMMENT ON COLUMN event_dates_times.capacity_override IS 'Optional capacity override for this specific date. If NULL, uses event capacity.';
COMMENT ON COLUMN event_dates_times.display_order IS 'Order in which dates should be displayed (lower numbers first)';

