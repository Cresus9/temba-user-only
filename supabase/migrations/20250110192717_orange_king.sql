-- Create auth_audit_log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  ip_address text NOT NULL,
  user_agent text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own audit log"
  ON auth_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON auth_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Create function to log auth events
CREATE OR REPLACE FUNCTION log_auth_event()
RETURNS trigger AS $$
BEGIN
  INSERT INTO auth_audit_log (
    user_id,
    ip_address,
    user_agent,
    location
  ) VALUES (
    NEW.id,
    current_setting('request.headers')::json->>'x-real-ip',
    current_setting('request.headers')::json->>'user-agent',
    NULL  -- Location will be updated by application logic
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for login events
CREATE TRIGGER on_auth_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_auth_event();