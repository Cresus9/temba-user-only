-- Update contact page with properly structured JSON content
UPDATE pages 
SET content = '{
  "email": "support@afritix.com",
  "phone": "+226 76 46 57 38",
  "address": "123 Innovation Hub, Ouagadougou, Burkina Faso",
  "hours": "Mon-Fri from 9am to 6pm WAT",
  "description": "Have questions? We''re here to help. Reach out to our team through any of the channels below."
}'::jsonb::text,
meta_title = 'Contact AfriTix - Get Support & Reach Our Team',
meta_description = 'Contact AfriTix support team for help with event tickets, bookings, or general inquiries. Available via email, phone, and live chat.',
published = true
WHERE slug = 'contact-us';

-- Insert if not exists
INSERT INTO pages (
  title,
  slug,
  content,
  meta_title,
  meta_description,
  published
) 
SELECT 
  'Contact Us',
  'contact-us',
  '{
    "email": "support@afritix.com",
    "phone": "+226 76 46 57 38",
    "address": "123 Innovation Hub, Ouagadougou, Burkina Faso",
    "hours": "Mon-Fri from 9am to 6pm WAT",
    "description": "Have questions? We''re here to help. Reach out to our team through any of the channels below."
  }'::jsonb::text,
  'Contact AfriTix - Get Support & Reach Our Team',
  'Contact AfriTix support team for help with event tickets, bookings, or general inquiries. Available via email, phone, and live chat.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM pages WHERE slug = 'contact-us'
);