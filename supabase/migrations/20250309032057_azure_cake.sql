/*
  # Fix Transfer Notifications

  1. Changes
    - Update notification trigger function to properly handle messages
    - Add proper message formatting for transfer notifications
    - Ensure all required fields are populated

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Update the transfer notification function to properly handle messages
CREATE OR REPLACE FUNCTION handle_transfer_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
  event_title text;
BEGIN
  -- Get sender name and event title
  SELECT 
    p.name, e.title INTO sender_name, event_title
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  JOIN profiles p ON p.user_id = NEW.sender_id
  WHERE t.id = NEW.ticket_id;

  -- Insert notification for new transfer request
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    )
    VALUES (
      NEW.recipient_id,
      'New Ticket Transfer Request',
      'Ticket transfer request from ' || sender_name || ' for ' || event_title,
      'TRANSFER_REQUEST',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'event_title', event_title
      )
    );
  -- Insert notification for updated transfer request
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Notify sender of acceptance/rejection
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    )
    VALUES (
      NEW.sender_id,
      CASE 
        WHEN NEW.status = 'COMPLETED' THEN 'Transfer Request Accepted'
        WHEN NEW.status = 'REJECTED' THEN 'Transfer Request Rejected'
        ELSE 'Transfer Request Updated'
      END,
      CASE 
        WHEN NEW.status = 'COMPLETED' THEN 'Your ticket transfer request for ' || event_title || ' has been accepted'
        WHEN NEW.status = 'REJECTED' THEN 'Your ticket transfer request for ' || event_title || ' has been rejected'
        ELSE 'Your ticket transfer request for ' || event_title || ' has been updated'
      END,
      'TRANSFER_UPDATE',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'status', NEW.status,
        'event_title', event_title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;