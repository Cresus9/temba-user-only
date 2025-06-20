-- Create email_tracking table
CREATE TABLE email_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  template_type text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  opened_at timestamptz,
  clicked_at timestamptz,
  link_clicked text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_email_tracking_email ON email_tracking(email);
CREATE INDEX idx_email_tracking_order_id ON email_tracking(order_id);
CREATE INDEX idx_email_tracking_created_at ON email_tracking(created_at);

-- Create policy for admin access
CREATE POLICY "Admins can view email tracking"
  ON email_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create function to track email open
CREATE OR REPLACE FUNCTION track_email_open(
  p_tracking_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_tracking
  SET opened_at = COALESCE(opened_at, now())
  WHERE id::text = p_tracking_id;
END;
$$;

-- Create function to track email click
CREATE OR REPLACE FUNCTION track_email_click(
  p_tracking_id text,
  p_link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_tracking
  SET 
    clicked_at = COALESCE(clicked_at, now()),
    link_clicked = p_link
  WHERE id::text = p_tracking_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION track_email_open TO anon;
GRANT EXECUTE ON FUNCTION track_email_click TO anon;