-- Update banners with high-quality images
INSERT INTO banners (
  title,
  image_url,
  description,
  display_order,
  active
) VALUES
  (
    'Afro Nation Burkina 2024',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
    'The biggest Afrobeats festival in Africa returns to Burkina Faso! Experience an incredible lineup of top African artists.',
    1,
    true
  ),
  (
    'Festival des Arts de Ouaga',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
    'A celebration of Burkinabe arts and culture featuring local and international artists.',
    2,
    true
  ),
  (
    'Fête de la Musique',
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
    'Join us for a night of live music across Ouagadougou. Free admission to all venues!',
    3,
    true
  ),
  (
    'FESPACO 2024',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728',
    'The largest African film festival returns. Experience the best of African cinema.',
    4,
    true
  ),
  (
    'Salon International de l''Artisanat de Ouagadougou',
    'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17',
    'Discover the finest African crafts and artisanal products at SIAO 2024.',
    5,
    true
  ),
  (
    'Festival des Masques et des Arts',
    'https://images.unsplash.com/photo-1551537482-f2075a1d41f2',
    'Experience traditional mask dances and cultural performances from across West Africa.',
    6,
    true
  );