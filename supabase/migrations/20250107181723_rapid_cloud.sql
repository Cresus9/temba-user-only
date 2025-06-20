/*
  # Add User Policies and Profile Handling
  
  1. Policies
    - Enable profile management
    - Add admin access controls
    - Secure user data access
  
  2. Profile Handling
    - Add trigger for profile creation on auth signup
*/

-- Create profile handling function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'USER')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update user policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (
      SELECT role FROM users WHERE id = auth.uid()
    ) = (
      SELECT role FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all profiles"
  ON users FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON users FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role = 'ADMIN'
    )
  );