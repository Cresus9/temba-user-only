-- Create function to handle new orders and send confirmation emails
CREATE OR REPLACE FUNCTION handle_order_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_event_title TEXT;
  v_event_date TEXT;
  v_event_time TEXT;
  v_event_location TEXT;
  v_tickets JSONB;
  v_total NUMERIC;
  v_currency TEXT;
BEGIN
  -- Get user details
  SELECT email, name INTO v_user_email, v_user_name
  FROM auth.users u
  JOIN profiles p ON p.user_id = u.id
  WHERE u.id = NEW.user_id;

  -- Get event details
  SELECT 
    e.title,
    e.date::TEXT,
    e.time,
    e.location,
    e.currency
  INTO 
    v_event_title,
    v_event_date,
    v_event_time,
    v_event_location,
    v_currency
  FROM events e
  WHERE e.id = NEW.event_id;

  -- Get tickets information
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', tt.name,
      'quantity', t.quantity,
      'price', tt.price
    )
  ) INTO v_tickets
  FROM tickets t
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  WHERE t.order_id = NEW.id;

  -- Send email via Edge Function
  PERFORM net.http_post(
    url := 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/ticket-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', current_setting('request.headers')::json->>'authorization'
    ),
    body := jsonb_build_object(
      'to', v_user_email,
      'subject', 'Your Tickets for ' || v_event_title,
      'template', 'ticketConfirmation',
      'data', jsonb_build_object(
        'orderNumber', NEW.id,
        'eventTitle', v_event_title,
        'eventDate', v_event_date,
        'eventTime', v_event_time,
        'eventLocation', v_event_location,
        'tickets', v_tickets,
        'total', NEW.total,
        'currency', v_currency,
        'userName', v_user_name
      )
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent order creation
    RAISE WARNING 'Failed to send order confirmation email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS on_order_created ON orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_confirmation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_order_confirmation TO authenticated;