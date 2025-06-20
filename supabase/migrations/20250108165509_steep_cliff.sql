-- Create newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  CONSTRAINT newsletter_subscriptions_status_check 
    CHECK (status IN ('ACTIVE', 'UNSUBSCRIBED'))
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for all users"
  ON newsletter_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable read for admins"
  ON newsletter_subscriptions FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));

-- Create index
CREATE INDEX idx_newsletter_subscriptions_email 
  ON newsletter_subscriptions(email);