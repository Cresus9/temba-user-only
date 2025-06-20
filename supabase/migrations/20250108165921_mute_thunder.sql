-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscriptions;

-- Create new policy with public access
CREATE POLICY "Public newsletter subscription"
  ON newsletter_subscriptions
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- Ensure email validation is in place
CREATE OR REPLACE FUNCTION validate_newsletter_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_newsletter_email_before_insert ON newsletter_subscriptions;
CREATE TRIGGER validate_newsletter_email_before_insert
  BEFORE INSERT ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_newsletter_email();