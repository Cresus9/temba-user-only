-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_order_created ON orders;
DROP FUNCTION IF EXISTS handle_order_confirmation();

-- Create improved order confirmation function
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
  v_currency TEXT;
BEGIN
  -- Get user details
  SELECT 
    u.email,
    p.name 
  INTO v_user_email, v_user_name
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
  WITH ticket_counts AS (
    SELECT 
      tt.id as ticket_type_id,
      tt.name as ticket_type_name,
      tt.price,
      COUNT(*) as quantity
    FROM tickets t
    JOIN ticket_types tt ON tt.id = t.ticket_type_id
    WHERE t.order_id = NEW.id
    GROUP BY tt.id, tt.name, tt.price
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', ticket_type_name,
      'quantity', quantity,
      'price', price
    )
  ) INTO v_tickets
  FROM ticket_counts;

  -- Send email via ticket-email Edge Function
  PERFORM net.http_post(
    url := 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/ticket-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc'
    ),
    body := jsonb_build_object(
      'orderNumber', NEW.id,
      'eventTitle', v_event_title,
      'eventDate', v_event_date,
      'eventTime', v_event_time,
      'eventLocation', v_event_location,
      'tickets', v_tickets,
      'total', NEW.total,
      'currency', v_currency,
      'userName', v_user_name,
      'userEmail', v_user_email
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
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_confirmation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_order_confirmation TO authenticated;