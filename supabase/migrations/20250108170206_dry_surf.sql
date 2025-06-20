-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public newsletter subscription" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can view subscriptions" ON newsletter_subscriptions;

-- Create a single policy that allows public inserts without auth
CREATE POLICY "newsletter_subscriptions_policy"
  ON newsletter_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled but allows public access
ALTER TABLE newsletter_subscriptions FORCE ROW LEVEL SECURITY;