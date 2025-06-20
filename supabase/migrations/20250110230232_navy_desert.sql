-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If user is marked as deleted, cascade delete their data
  IF (NEW.raw_user_meta_data->>'deleted')::boolean = true THEN
    -- Delete user's profile
    DELETE FROM profiles WHERE user_id = NEW.id;
    
    -- Delete user's notifications
    DELETE FROM notification_preferences WHERE user_id = NEW.id;
    
    -- Delete user's tickets
    DELETE FROM tickets WHERE user_id = NEW.id;
    
    -- Delete user's orders
    DELETE FROM orders WHERE user_id = NEW.id;
    
    -- Finally, delete the actual user
    DELETE FROM auth.users WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_user_deleted ON auth.users;
CREATE TRIGGER on_user_deleted
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- Add policies to allow users to delete their own data
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);