-- Add event_id column to banners table
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_banners_event_id ON banners(event_id);

-- Update existing banners to link to events
UPDATE banners b
SET event_id = e.id
FROM events e
WHERE b.title LIKE '%' || e.title || '%'
AND b.event_id IS NULL;