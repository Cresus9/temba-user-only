/*
  # Add Order Email Trigger

  1. New Trigger
    - Creates a trigger to send confirmation emails after order creation
    - Calls order-email function via HTTP request

  2. Security
    - Trigger runs with security definer permissions
    - Only fires for new orders
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION public.send_order_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Make HTTP request to order-email function
  PERFORM
    net.http_post(
      url := CURRENT_SETTING('app.settings.supabase_url') || '/functions/v1/order-email',
      body := json_build_object('orderId', NEW.id)::text,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || CURRENT_SETTING('app.settings.service_role_key')
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER send_order_email_trigger
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.send_order_email();

-- Add comment
COMMENT ON FUNCTION public.send_order_email() IS 'Sends confirmation email when a new order is created';