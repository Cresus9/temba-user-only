-- Add coordinates column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS coordinates jsonb DEFAULT jsonb_build_object(
  'latitude', 12.3714,  -- Default to Ouagadougou coordinates
  'longitude', -1.5197
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_coordinates ON events USING GIN (coordinates);

-- Update existing events to have default coordinates
UPDATE events 
SET coordinates = jsonb_build_object(
  'latitude', 12.3714,
  'longitude', -1.5197
)
WHERE coordinates IS NULL;