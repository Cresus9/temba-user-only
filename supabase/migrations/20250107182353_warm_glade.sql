/*
  # Event Management Schema Update

  1. New Tables
    - `event_categories` - Lookup table for event categories
    - `event_images` - Store multiple images per event
    - `event_reviews` - User reviews and ratings

  2. Security
    - Enable RLS on all new tables
    - Add policies for event management
    - Add policies for reviews

  3. Changes
    - Add rating and review fields to events
    - Add image gallery support
*/

-- Event Categories Lookup
CREATE TABLE IF NOT EXISTS event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event Images
CREATE TABLE IF NOT EXISTS event_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event Reviews
CREATE TABLE IF NOT EXISTS event_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Add rating fields to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Enable RLS
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Event Categories Policies
CREATE POLICY "Anyone can view event categories"
  ON event_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage event categories"
  ON event_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Event Images Policies
CREATE POLICY "Anyone can view event images"
  ON event_images FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "Admins can manage event images"
  ON event_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Event Reviews Policies
CREATE POLICY "Anyone can view event reviews"
  ON event_reviews FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.status = 'PUBLISHED'
    )
  );

CREATE POLICY "Authenticated users can create reviews"
  ON event_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.event_id = event_id
      AND tickets.user_id = auth.uid()
      AND tickets.status = 'USED'
    )
  );

CREATE POLICY "Users can update own reviews"
  ON event_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS event_images_event_id_idx ON event_images(event_id);
CREATE INDEX IF NOT EXISTS event_images_primary_idx ON event_images(event_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS event_reviews_event_id_idx ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS event_reviews_user_id_idx ON event_reviews(user_id);

-- Update triggers
CREATE TRIGGER update_event_categories_updated_at
  BEFORE UPDATE ON event_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_event_images_updated_at
  BEFORE UPDATE ON event_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_event_reviews_updated_at
  BEFORE UPDATE ON event_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default categories
INSERT INTO event_categories (name, description, icon) VALUES
  ('Music', 'Live performances and concerts', 'music'),
  ('Sports', 'Sporting events and tournaments', 'trophy'),
  ('Arts', 'Art exhibitions and cultural events', 'palette'),
  ('Business', 'Conferences and networking events', 'briefcase'),
  ('Food', 'Food festivals and culinary events', 'utensils'),
  ('Technology', 'Tech conferences and meetups', 'laptop')
ON CONFLICT (name) DO NOTHING;