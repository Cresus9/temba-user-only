/*
  # Add ticket scan email notification

  1. New Functions
    - `send_ticket_scan_email()`: Sends email notification when ticket is scanned
    - `notify_ticket_scan()`: Handles ticket scan notification logic

  2. Triggers
    - Add trigger on tickets table for scan updates

  3. Security
    - Function is security definer to allow email sending
*/

-- Create function to send ticket scan email
CREATE OR REPLACE FUNCTION public.send_ticket_scan_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_event_title text;
  v_scan_location text;
  v_scan_time timestamptz;
  v_scanner_name text;
BEGIN
  -- Get user email and event details
  SELECT 
    p.email,
    e.title,
    NEW.scan_location,
    NEW.scanned_at,
    sp.name
  INTO 
    v_user_email,
    v_event_title,
    v_scan_location,
    v_scan_time,
    v_scanner_name
  FROM tickets t
  JOIN profiles p ON p.user_id = t.user_id
  JOIN events e ON e.id = t.event_id
  LEFT JOIN profiles sp ON sp.user_id = NEW.scanned_by
  WHERE t.id = NEW.id;

  -- Send email via Edge Function
  PERFORM
    net.http_post(
      url := CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/send-email'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))
      ),
      body := jsonb_build_object(
        'to', v_user_email,
        'subject', CONCAT('Ticket Scanned - ', v_event_title),
        'html', CONCAT(
          '<h2>Your ticket has been scanned</h2>',
          '<p>Event: ', v_event_title, '</p>',
          '<p>Location: ', v_scan_location, '</p>',
          '<p>Time: ', to_char(v_scan_time, 'YYYY-MM-DD HH24:MI:SS'), '</p>',
          CASE 
            WHEN v_scanner_name IS NOT NULL THEN '<p>Scanned by: ' || v_scanner_name || '</p>'
            ELSE ''
          END,
          '<p>If you did not authorize this scan, please contact support immediately.</p>'
        )
      )
    );

  RETURN NEW;
END;
$$;

-- Create trigger to send email on ticket scan
CREATE OR REPLACE TRIGGER ticket_scan_email_trigger
  AFTER UPDATE OF scanned_at
  ON tickets
  FOR EACH ROW
  WHEN (OLD.scanned_at IS NULL AND NEW.scanned_at IS NOT NULL)
  EXECUTE FUNCTION send_ticket_scan_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.send_ticket_scan_email TO service_role;