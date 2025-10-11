/*
  # Improved Category System Migration

  This migration implements a normalized category system with:
  1. Enhanced categories table with proper schema
  2. Junction table for many-to-many event-category relationships
  3. Proper indexing for performance
  4. Migration of existing array-based categories to the new system
*/

-- Step 1: Drop existing event_categories table and recreate with improved schema
DROP TABLE IF EXISTS event_categories CASCADE;

-- Create improved categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL,
  description TEXT,
  subcategories TEXT[], -- Array of subcategory names
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for many-to-many relationships
CREATE TABLE event_category_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, category_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_event_category_relations_event_id ON event_category_relations(event_id);
CREATE INDEX idx_event_category_relations_category_id ON event_category_relations(category_id);
CREATE INDEX idx_events_status ON events(status);

-- Step 3: Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_category_relations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Event category relations policies
CREATE POLICY "Event category relations are viewable by everyone" ON event_category_relations
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage event category relations" ON event_category_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Step 5: Insert default categories with proper schema
INSERT INTO categories (name, icon, color, description, subcategories) VALUES
  ('Cinema', 'clapperboard', '#ef4444', 'Movie premieres and film festivals', 
   ARRAY['Premieres', 'Film Festivals', 'Screenings']),
  ('Festivals', 'party-popper', '#f97316', 'Cultural celebrations and festivals', 
   ARRAY['Cultural', 'Food', 'Art', 'Music']),
  ('Music Concerts', 'music', '#4f46e5', 'Live performances from top artists', 
   ARRAY['Afrobeats', 'Jazz', 'Traditional']),
  ('Sports', 'trophy', '#10b981', 'Major sporting events', 
   ARRAY['Football', 'Athletics', 'Boxing'])
ON CONFLICT (name) DO NOTHING;

-- Step 6: Create triggers for updated_at timestamps
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_event_category_relations_updated_at
  BEFORE UPDATE ON event_category_relations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Step 7: Create function to migrate existing array-based categories
CREATE OR REPLACE FUNCTION migrate_existing_categories()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  event_record RECORD;
  category_name TEXT;
  category_id UUID;
BEGIN
  -- Loop through all events that have categories array
  FOR event_record IN 
    SELECT id, categories 
    FROM events 
    WHERE categories IS NOT NULL 
    AND array_length(categories, 1) > 0
  LOOP
    -- For each category in the array
    FOREACH category_name IN ARRAY event_record.categories
    LOOP
      -- Find or create the category
      SELECT id INTO category_id
      FROM categories
      WHERE name = category_name;
      
      -- If category doesn't exist, create it
      IF category_id IS NULL THEN
        INSERT INTO categories (name, icon, color, description)
        VALUES (category_name, 'tag', '#6b7280', 'Auto-generated category')
        RETURNING id INTO category_id;
      END IF;
      
      -- Create the relationship
      INSERT INTO event_category_relations (event_id, category_id)
      VALUES (event_record.id, category_id)
      ON CONFLICT (event_id, category_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Step 8: Execute the migration function
SELECT migrate_existing_categories();

-- Step 9: Create helper functions for category operations
CREATE OR REPLACE FUNCTION get_events_by_category(category_id_param UUID)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  description TEXT,
  date DATE,
  "time" TEXT,
  location TEXT,
  image_url TEXT,
  price NUMERIC,
  currency TEXT,
  capacity INTEGER,
  tickets_sold INTEGER,
  status TEXT,
  featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.title, e.description, e.date, e.time, e.location, 
         e.image_url, e.price, e.currency, e.capacity, e.tickets_sold, 
         e.status, e.featured, e.created_at, e.updated_at
  FROM events e
  JOIN event_category_relations ecr ON e.id = ecr.event_id
  WHERE ecr.category_id = category_id_param 
    AND e.status = 'PUBLISHED'
  ORDER BY e.date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION get_events_by_categories(category_ids UUID[])
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  description TEXT,
  date DATE,
  "time" TEXT,
  location TEXT,
  image_url TEXT,
  price NUMERIC,
  currency TEXT,
  capacity INTEGER,
  tickets_sold INTEGER,
  status TEXT,
  featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e.id, e.title, e.description, e.date, e.time, e.location, 
         e.image_url, e.price, e.currency, e.capacity, e.tickets_sold, 
         e.status, e.featured, e.created_at, e.updated_at
  FROM events e
  JOIN event_category_relations ecr ON e.id = ecr.event_id
  WHERE ecr.category_id = ANY(category_ids) 
    AND e.status = 'PUBLISHED'
  ORDER BY e.date ASC;
END;
$$;

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 