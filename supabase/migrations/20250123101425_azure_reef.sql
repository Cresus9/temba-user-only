-- Insert sample pages
INSERT INTO pages (title, content, published) VALUES
  ('About Us', 'AfriTix is the leading event ticketing platform in Africa...', true),
  ('Terms of Service', 'Please read these terms of service carefully...', true),
  ('Privacy Policy', 'Your privacy is important to us...', true),
  ('Contact Us', 'Get in touch with our team...', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample banners
INSERT INTO banners (title, image_url, description, display_order, active) VALUES
  ('Afro Nation Ghana 2024', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea', 'The biggest Afrobeats festival in Africa', 1, true),
  ('Lagos Jazz Festival', 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae', 'A celebration of jazz music', 2, true),
  ('Cultural Festival', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3', 'Experience African culture', 3, true)
ON CONFLICT DO NOTHING;

-- Insert sample FAQs
INSERT INTO faqs (question, answer, category, display_order) VALUES
  ('How do I purchase tickets?', 'You can purchase tickets directly through our website by selecting an event and choosing your desired ticket type.', 'Tickets', 1),
  ('What payment methods do you accept?', 'We accept credit/debit cards and mobile money payments.', 'Payments', 1),
  ('Can I get a refund?', 'Refund policies vary by event. Please check the event details page for specific refund policies.', 'Tickets', 2),
  ('How do I contact support?', 'You can reach our support team through the Support section in your dashboard.', 'Support', 1)
ON CONFLICT DO NOTHING;