-- Insert sample event
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
  categories
) VALUES (
  'Afro Nation Ghana 2024',
  'The biggest Afrobeats festival in Africa returns to Ghana! Experience an incredible lineup of top African artists.',
  '2024-12-15',
  '18:00',
  'Accra Sports Stadium',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
  300.00,
  'GHS',
  20000,
  'PUBLISHED',
  ARRAY['Music', 'Festival']
);

-- Add ticket types for the event
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
  'VIP access with premium viewing area',
  500.00,
  1000,
  1000,
  4
FROM events
WHERE title = 'Afro Nation Ghana 2024';

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
  300.00,
  19000,
  19000,
  6
FROM events
WHERE title = 'Afro Nation Ghana 2024';