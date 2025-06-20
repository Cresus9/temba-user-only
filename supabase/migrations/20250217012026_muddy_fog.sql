-- Update existing event to be featured
UPDATE events 
SET featured = true 
WHERE title = 'Afro Nation Burkina 2024';

-- Insert another featured event if it doesn't exist
INSERT INTO events (
  title,
  description,
  date,
  time,
  location,
  image_url,
  price,
  currency,
  capacity,
  status,
  categories,
  featured
) VALUES (
  'Festival des Arts de Ouaga',
  'A celebration of Burkinabe arts and culture featuring local and international artists.',
  '2024-12-20',
  '19:00',
  'Maison du Peuple, Ouagadougou',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
  25000.00,
  'XOF',
  5000,
  'PUBLISHED',
  ARRAY['Arts', 'Cultural', 'Festival'],
  true
)
ON CONFLICT DO NOTHING;

-- Add ticket types for the new event
INSERT INTO ticket_types (
  event_id,
  name,
  description,
  price,
  quantity,
  available,
  max_per_order
)
SELECT 
  id as event_id,
  'VIP',
  'VIP access with premium seating and refreshments',
  40000.00,
  500,
  500,
  4
FROM events
WHERE title = 'Festival des Arts de Ouaga'
ON CONFLICT DO NOTHING;

INSERT INTO ticket_types (
  event_id,
  name,
  description,
  price,
  quantity,
  available,
  max_per_order
)
SELECT 
  id as event_id,
  'Regular',
  'General admission ticket',
  25000.00,
  4500,
  4500,
  6
FROM events
WHERE title = 'Festival des Arts de Ouaga'
ON CONFLICT DO NOTHING;