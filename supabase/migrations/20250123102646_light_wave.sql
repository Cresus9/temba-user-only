-- Create admin chat sessions table
CREATE TABLE admin_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz,
  UNIQUE(admin_id, user_id)
);

-- Create admin chat messages table
CREATE TABLE admin_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES admin_chat_sessions(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat sessions
CREATE POLICY "chat_sessions_select"
  ON admin_chat_sessions
  FOR SELECT
  USING (user_id = auth.uid() OR admin_id = auth.uid());

CREATE POLICY "chat_sessions_insert"
  ON admin_chat_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "chat_sessions_update"
  ON admin_chat_sessions
  FOR UPDATE
  WITH CHECK (user_id = auth.uid() OR admin_id = auth.uid());

-- Create policies for chat messages
CREATE POLICY "chat_messages_select"
  ON admin_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_chat_sessions
      WHERE id = session_id
      AND (user_id = auth.uid() OR admin_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_insert"
  ON admin_chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_chat_sessions
      WHERE id = session_id
      AND (user_id = auth.uid() OR admin_id = auth.uid())
      AND status = 'ACTIVE'
    )
  );

-- Create indexes
CREATE INDEX idx_admin_chat_sessions_admin_id ON admin_chat_sessions(admin_id);
CREATE INDEX idx_admin_chat_sessions_user_id ON admin_chat_sessions(user_id);
CREATE INDEX idx_admin_chat_sessions_status ON admin_chat_sessions(status);
CREATE INDEX idx_admin_chat_messages_session_id ON admin_chat_messages(session_id);
CREATE INDEX idx_admin_chat_messages_created_at ON admin_chat_messages(created_at);

-- Create function to update last message timestamp
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_chat_sessions
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last message timestamp
CREATE TRIGGER update_chat_session_last_message
  AFTER INSERT ON admin_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_timestamp();

-- Create view for chat session details
CREATE OR REPLACE VIEW admin_chat_session_details AS
SELECT 
  acs.*,
  admin_profile.name as admin_name,
  admin_profile.email as admin_email,
  user_profile.name as user_name,
  user_profile.email as user_email,
  (
    SELECT COUNT(*) 
    FROM admin_chat_messages acm 
    WHERE acm.session_id = acs.id
  ) as message_count,
  (
    SELECT message 
    FROM admin_chat_messages acm 
    WHERE acm.session_id = acs.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message
FROM admin_chat_sessions acs
LEFT JOIN profiles admin_profile ON admin_profile.user_id = acs.admin_id
LEFT JOIN profiles user_profile ON user_profile.user_id = acs.user_id;