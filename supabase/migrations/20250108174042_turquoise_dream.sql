-- Drop and recreate newsletter_subscriptions table with proper structure
DROP TABLE IF EXISTS newsletter_subscriptions;

CREATE TABLE newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT newsletter_subscriptions_status_check 
    CHECK (status IN ('ACTIVE', 'UNSUBSCRIBED'))
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "newsletter_subscriptions_policy"
  ON newsletter_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Create email validation trigger
CREATE OR REPLACE FUNCTION validate_newsletter_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_newsletter_email_before_insert
  BEFORE INSERT ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_newsletter_email();

-- Create index for better performance
CREATE INDEX idx_newsletter_subscriptions_email 
  ON newsletter_subscriptions(email);