-- Drop existing policies
DROP POLICY IF EXISTS "Public newsletter subscription" ON newsletter_subscriptions;

-- Create new policy with no restrictions
CREATE POLICY "Allow public newsletter subscription"
  ON newsletter_subscriptions
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- Add policy for admin access
CREATE POLICY "Admins can view subscriptions"
  ON newsletter_subscriptions
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));