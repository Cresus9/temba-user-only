-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for all users" ON newsletter_subscriptions;

-- Create new policy that allows anyone to subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Add validation trigger for email format
CREATE OR REPLACE FUNCTION validate_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_email_before_insert
  BEFORE INSERT ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_email();