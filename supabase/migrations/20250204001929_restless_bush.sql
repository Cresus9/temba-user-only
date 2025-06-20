-- Update About Us page content to ensure consistency
UPDATE pages 
SET content = '# About AfriTix

AfriTix is West Africa''s premier event ticketing platform, revolutionizing how people discover, book, and experience events across the region. Founded in Burkina Faso, we''ve grown to become the trusted partner for event organizers and attendees alike.

## Our Mission

Our mission is to connect people through unforgettable experiences while empowering event organizers with powerful tools and insights. We believe in making event ticketing seamless, secure, and accessible to all.

## What Sets Us Apart

- **Local Expertise**: Deep understanding of West African markets and cultural events
- **Mobile-First**: Optimized for the way Africa connects, with support for mobile money payments
- **Secure Platform**: State-of-the-art security measures to protect your transactions
- **Real-Time Updates**: Instant notifications and live event updates
- **Bilingual Support**: Customer service in both French and English

## Our Technology

We leverage cutting-edge technology to provide:
- QR-based digital tickets
- Real-time seat selection
- Automated refunds
- Analytics for organizers
- Fraud prevention systems

## Community Impact

We''re committed to supporting local events and cultural preservation. A percentage of our proceeds goes towards supporting emerging artists and cultural initiatives across West Africa.

## Join Our Journey

Whether you''re an event organizer looking to reach wider audiences or an attendee seeking the next great experience, AfriTix is your trusted partner in creating memorable moments.

Contact us at support@afritix.com to learn more about how we can help bring your events to life.',
meta_title = 'About AfriTix - West Africa''s Leading Event Ticketing Platform',
meta_description = 'Discover AfriTix, West Africa''s premier event ticketing platform. We connect people through unforgettable experiences with secure, mobile-first ticketing solutions.',
published = true
WHERE slug = 'about-us';

-- Create a short version of the About Us content for the footer
CREATE TABLE IF NOT EXISTS content_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE content_snippets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public users can view content snippets"
  ON content_snippets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage content snippets"
  ON content_snippets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Insert footer about content
INSERT INTO content_snippets (key, content) VALUES
  ('footer_about', 'AfriTix is your trusted platform for discovering and booking amazing events across Africa.')
ON CONFLICT (key) DO UPDATE
SET content = EXCLUDED.content;