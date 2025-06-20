/*
  # Update Users Table RLS Policies

  1. Changes
    - Add policy for inserting new users on signup
    - Update view policy to allow admins to view all users
    - Add policy for profile updates

  2. Security
    - Users can only view/edit their own data
    - Admins can view all user data
    - New users can be created during signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies
CREATE POLICY "Enable read access for own profile"
  ON users FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Enable insert for authentication"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);