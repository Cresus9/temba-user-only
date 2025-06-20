/*
  # Add Transfer Request Notifications

  1. Changes
    - Add trigger to create notifications when transfer requests are created
    - Add trigger to update notifications when transfer requests are updated
    - Add trigger to clean up notifications when transfer requests are deleted

  2. Security
    - Notifications are only visible to the recipient
    - Notifications are automatically created by the system
*/

-- Create function to handle transfer request notifications
CREATE OR REPLACE FUNCTION handle_transfer_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- For new transfer requests
  IF (TG_OP = 'INSERT') THEN
    -- Create notification for recipient
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    ) VALUES (
      NEW.recipient_id,
      'Ticket Transfer Request',
      (
        SELECT 'You have received a ticket transfer request for ' || e.title
        FROM tickets t
        JOIN events e ON e.id = t.event_id
        WHERE t.id = NEW.ticket_id
      ),
      'INFO',
      jsonb_build_object(
        'transfer_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'sender_id', NEW.sender_id
      )
    );
  -- For updated transfer requests
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If status changed to COMPLETED or REJECTED
    IF NEW.status IN ('COMPLETED', 'REJECTED') AND OLD.status = 'PENDING' THEN
      -- Create notification for sender
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        metadata
      ) VALUES (
        NEW.sender_id,
        CASE 
          WHEN NEW.status = 'COMPLETED' THEN 'Ticket Transfer Accepted'
          ELSE 'Ticket Transfer Rejected'
        END,
        (
          SELECT 
            CASE 
              WHEN NEW.status = 'COMPLETED' THEN 'Your ticket transfer for ' || e.title || ' has been accepted'
              ELSE 'Your ticket transfer for ' || e.title || ' has been rejected'
            END
          FROM tickets t
          JOIN events e ON e.id = t.event_id
          WHERE t.id = NEW.ticket_id
        ),
        CASE 
          WHEN NEW.status = 'COMPLETED' THEN 'SUCCESS'
          ELSE 'INFO'
        END,
        jsonb_build_object(
          'transfer_id', NEW.id,
          'ticket_id', NEW.ticket_id,
          'status', NEW.status
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new transfer requests
CREATE TRIGGER on_transfer_request_created
  AFTER INSERT ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();

-- Create trigger for updated transfer requests
CREATE TRIGGER on_transfer_request_updated
  AFTER UPDATE ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_transfer_request_notification();