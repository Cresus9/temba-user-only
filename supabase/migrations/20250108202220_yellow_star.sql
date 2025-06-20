-- First modify the currency constraint to include XOF
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_currency_check;
ALTER TABLE events ADD CONSTRAINT events_currency_check 
  CHECK (currency IN ('XOF', 'GHS', 'USD', 'EUR', 'NGN'));

-- Then insert the sample event
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
  'Afro Nation Burkina 2024',
  'The biggest Afrobeats festival in West Africa returns to Burkina Faso! Experience an incredible lineup of top African artists.',
  '2024-12-15',
  '18:00',
  'Stade du 4 Août, Ouagadougou',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
  150000.00,
  'XOF',
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
  250000.00,
  1000,
  1000,
  4
FROM events
WHERE title = 'Afro Nation Burkina 2024';

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
  150000.00,
  19000,
  19000,
  6
FROM events
WHERE title = 'Afro Nation Burkina 2024';