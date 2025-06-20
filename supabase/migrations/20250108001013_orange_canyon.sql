-- Drop problematic policies that may cause recursion
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;

-- Create simplified policies without recursion
CREATE POLICY "Allow public read"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated user update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated user insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin(user_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = user_uid
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update event policies to use the new function
CREATE POLICY "Admin access"
  ON events FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));