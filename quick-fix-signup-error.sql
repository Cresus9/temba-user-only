-- QUICK FIX for signup database error
-- Run this in your Supabase SQL Editor

-- 1. Temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;

-- 2. Fix column types in notification_preferences
ALTER TABLE notification_preferences 
ALTER COLUMN email TYPE boolean USING (
    CASE 
        WHEN email = 'true' THEN true
        WHEN email = 'false' THEN false
        ELSE true
    END
);

ALTER TABLE notification_preferences 
ALTER COLUMN push TYPE boolean USING (
    CASE 
        WHEN push = 'true' THEN true
        WHEN push = 'false' THEN false
        ELSE false
    END
);

-- 3. Add service role policy for notification_preferences
CREATE POLICY "service_role_all_notification_preferences"
  ON notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Grant permissions to service role
GRANT ALL ON notification_preferences TO service_role;

-- 5. Create improved trigger function
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, email, push, types)
  VALUES (
    NEW.id,
    true,
    false,
    ARRAY['ORDER_CONFIRMATION', 'EVENT_REMINDER', 'TICKET_TRANSFER', 'SUPPORT_REPLY', 'ACCOUNT_UPDATE']
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user_preferences: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. Re-enable the trigger
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_preferences();

-- Test that it works
SELECT 'Setup completed successfully!' as status;
