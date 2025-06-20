-- Drop problematic policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON users;
DROP POLICY IF EXISTS "Enable read access for own profile" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Create simplified policies for users table
CREATE POLICY "Enable read access for authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Enable read access for authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix events policies
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;

CREATE POLICY "Enable read access for all users"
  ON events FOR SELECT
  USING (status = 'PUBLISHED' OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));

CREATE POLICY "Enable write access for admins"
  ON events FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));

-- Fix ticket_types policies
DROP POLICY IF EXISTS "Anyone can view ticket types for published events" ON ticket_types;
DROP POLICY IF EXISTS "Admins can manage ticket types" ON ticket_types;

CREATE POLICY "Enable read access for all users"
  ON ticket_types FOR SELECT
  USING (true);

CREATE POLICY "Enable write access for admins"
  ON ticket_types FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));