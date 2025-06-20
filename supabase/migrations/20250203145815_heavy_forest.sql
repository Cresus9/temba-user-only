-- Create venue layouts table
CREATE TABLE venue_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create venue sections table
CREATE TABLE venue_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid REFERENCES venue_layouts ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL,
  price numeric NOT NULL,
  coordinates jsonb NOT NULL, -- Stores the polygon coordinates for the section
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create venue seats table
CREATE TABLE venue_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES venue_sections ON DELETE CASCADE,
  row text NOT NULL,
  number integer NOT NULL,
  coordinates jsonb NOT NULL, -- Stores the seat position {x, y}
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section_id, row, number)
);

-- Add venue layout reference to events
ALTER TABLE events ADD COLUMN venue_layout_id uuid REFERENCES venue_layouts;

-- Enable RLS
ALTER TABLE venue_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_seats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public users can view venue layouts"
  ON venue_layouts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage venue layouts"
  ON venue_layouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Public users can view venue sections"
  ON venue_sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage venue sections"
  ON venue_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Public users can view venue seats"
  ON venue_seats FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage venue seats"
  ON venue_seats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_venue_sections_layout_id ON venue_sections(layout_id);
CREATE INDEX idx_venue_seats_section_id ON venue_seats(section_id);
CREATE INDEX idx_venue_seats_status ON venue_seats(status);

-- Create function to update seat status
CREATE OR REPLACE FUNCTION update_seat_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the seat status when a ticket is created
  IF TG_OP = 'INSERT' THEN
    UPDATE venue_seats
    SET status = 'sold'
    WHERE id = NEW.seat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for seat status updates
CREATE TRIGGER update_seat_status_on_ticket
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_seat_status();

-- Insert sample venue layout
INSERT INTO venue_layouts (name, image_url) VALUES
  ('Stade du 4 Août', 'https://images.unsplash.com/photo-1486299267070-83823f5448dd');

-- Insert sample sections
WITH venue AS (
  SELECT id FROM venue_layouts WHERE name = 'Stade du 4 Août' LIMIT 1
)
INSERT INTO venue_sections (layout_id, name, capacity, price, coordinates)
SELECT 
  venue.id,
  section_name,
  section_capacity,
  section_price,
  section_coordinates::jsonb
FROM venue, (
  VALUES 
    ('VIP', 1000, 50000, '{"points": [[10,10], [30,10], [30,30], [10,30]]}'::jsonb),
    ('Regular', 5000, 25000, '{"points": [[35,10], [90,10], [90,30], [35,30]]}'::jsonb)
) AS sections(section_name, section_capacity, section_price, section_coordinates);