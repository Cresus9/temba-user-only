-- Drop existing auth-related functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;
DROP FUNCTION IF EXISTS log_auth_event();

-- Create improved user handling function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'USER');
  profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = NEW.id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    -- Create new profile
    INSERT INTO public.profiles (
      user_id,
      email,
      name,
      role,
      status
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      default_role,
      'ACTIVE'
    );
  END IF;

  -- Log the signup event
  INSERT INTO auth_audit_log (
    user_id,
    ip_address,
    user_agent,
    location
  ) VALUES (
    NEW.id,
    COALESCE(current_setting('request.headers', true)::json->>'x-real-ip', 'unknown'),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown'),
    NULL
  );

  RETURN NEW;
EXCEPTION 
  WHEN unique_violation THEN
    -- If we hit a race condition, just return NEW
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create improved auth event logging function
CREATE OR REPLACE FUNCTION log_auth_event()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auth_audit_log (
    user_id,
    ip_address,
    user_agent,
    location
  ) VALUES (
    NEW.user_id,
    COALESCE(current_setting('request.headers', true)::json->>'x-real-ip', 'unknown'),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown'),
    NULL
  );
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE LOG 'Error in log_auth_event: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate triggers with proper error handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_auth_event();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;