/*
  # Add ticket scan email template and webhook

  1. New Functions
    - Update scan email template with better formatting and details
    - Add webhook configuration for scan notifications

  2. Changes
    - Enhance email template with more details and better styling
    - Add tracking capabilities
*/

-- Update the send_ticket_scan_email function with better template
CREATE OR REPLACE FUNCTION public.send_ticket_scan_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_event_title text;
  v_event_date date;
  v_event_time text;
  v_event_location text;
  v_scan_location text;
  v_scan_time timestamptz;
  v_scanner_name text;
  v_ticket_type text;
BEGIN
  -- Get all required information
  SELECT 
    p.email,
    e.title,
    e.date,
    e.time,
    e.location,
    NEW.scan_location,
    NEW.scanned_at,
    sp.name,
    tt.name
  INTO 
    v_user_email,
    v_event_title,
    v_event_date,
    v_event_time,
    v_event_location,
    v_scan_location,
    v_scan_time,
    v_scanner_name,
    v_ticket_type
  FROM tickets t
  JOIN profiles p ON p.user_id = t.user_id
  JOIN events e ON e.id = t.event_id
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  LEFT JOIN profiles sp ON sp.user_id = NEW.scanned_by
  WHERE t.id = NEW.id;

  -- Generate tracking ID
  DECLARE
    v_tracking_id uuid := gen_random_uuid();
  BEGIN
    -- Insert tracking record
    INSERT INTO email_tracking (
      id,
      email,
      template_type,
      order_id
    ) VALUES (
      v_tracking_id,
      v_user_email,
      'TICKET_SCAN',
      (SELECT order_id FROM tickets WHERE id = NEW.id)
    );

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
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            '<title>Ticket Scanned</title>',
            '</head>',
            '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">',
            '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">',
            
            -- Header
            '<div style="background-color: #4f46e5; padding: 20px; border-radius: 8px 8px 0 0;">',
            '<h1 style="color: white; margin: 0;">Ticket Scanned</h1>',
            '</div>',
            
            -- Content
            '<div style="background-color: #fff; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">',
            
            -- Event Details
            '<div style="margin-bottom: 20px;">',
            '<h2 style="color: #4f46e5; margin-top: 0;">', v_event_title, '</h2>',
            '<p style="color: #666;">',
            'Your ticket was just scanned at the event entrance. Here are the details:',
            '</p>',
            '</div>',
            
            -- Scan Details
            '<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">',
            '<h3 style="margin-top: 0;">Scan Details</h3>',
            '<p><strong>Location:</strong> ', v_scan_location, '</p>',
            '<p><strong>Time:</strong> ', to_char(v_scan_time, 'YYYY-MM-DD HH24:MI:SS'), '</p>',
            CASE 
              WHEN v_scanner_name IS NOT NULL THEN '<p><strong>Scanned by:</strong> ' || v_scanner_name || '</p>'
              ELSE ''
            END,
            '<p><strong>Ticket Type:</strong> ', v_ticket_type, '</p>',
            '</div>',
            
            -- Event Information
            '<div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin-bottom: 20px;">',
            '<h3 style="color: #f97316; margin-top: 0;">Event Information</h3>',
            '<p><strong>Date:</strong> ', to_char(v_event_date, 'Day, DD Mon YYYY'), '</p>',
            '<p><strong>Time:</strong> ', v_event_time, '</p>',
            '<p><strong>Location:</strong> ', v_event_location, '</p>',
            '</div>',
            
            -- Security Notice
            '<div style="background-color: #fee2e2; border-radius: 8px; padding: 15px; margin-bottom: 20px;">',
            '<p style="color: #991b1b; margin: 0;">',
            'If you did not authorize this scan or notice any suspicious activity, ',
            'please contact our support team immediately.',
            '</p>',
            '</div>',
            
            -- Footer
            '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">',
            '<p style="color: #666; font-size: 12px; text-align: center;">',
            'This is an automated message from AfriTix. Please do not reply to this email.',
            '</p>',
            '</div>',
            '</div>',
            
            -- Tracking Pixel
            '<img src="', 
            current_setting('app.settings.supabase_url'), 
            '/functions/v1/track-email?id=', 
            v_tracking_id,
            '" width="1" height="1" style="display:none" alt="" />',
            
            '</body>',
            '</html>'
          )
        )
      );
  END;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'ticket_scan_email_trigger'
  ) THEN
    CREATE TRIGGER ticket_scan_email_trigger
      AFTER UPDATE OF scanned_at
      ON tickets
      FOR EACH ROW
      WHEN (OLD.scanned_at IS NULL AND NEW.scanned_at IS NOT NULL)
      EXECUTE FUNCTION send_ticket_scan_email();
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.send_ticket_scan_email TO service_role;