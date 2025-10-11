-- =====================================================
-- PRODUCTION SECURITY ENHANCEMENTS
-- =====================================================
-- This migration adds security and monitoring features for production payments

-- 1. Enhance payments table with security fields
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_ip INET;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_client_ip ON payments(client_ip);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_webhook_id ON payments(webhook_id);

-- 2. Enhance payment_webhooks table
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS client_ip INET;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for webhook monitoring
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_client_ip ON payment_webhooks(client_ip);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON payment_webhooks(created_at);

-- 3. Create payment_audit_log table for security monitoring
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'completed', 'failed', 'refunded'
  old_status TEXT,
  new_status TEXT,
  amount DECIMAL(10,2),
  currency TEXT,
  user_id UUID,
  client_ip INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for audit log
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action ON payment_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_client_ip ON payment_audit_log(client_ip);

-- 4. Create payment_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS payment_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address, user_id, etc.
  identifier_type TEXT NOT NULL, -- 'ip', 'user', 'email'
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_rate_limits_identifier_type_window ON payment_rate_limits(identifier, identifier_type, window_start);
CREATE INDEX IF NOT EXISTS idx_payment_rate_limits_window_end ON payment_rate_limits(window_end);

-- 5. Create payment_security_events table for security monitoring
CREATE TABLE IF NOT EXISTS payment_security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'invalid_signature', 'suspicious_ip', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  client_ip INET,
  user_agent TEXT,
  user_id UUID,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for security events
CREATE INDEX IF NOT EXISTS idx_payment_security_events_type ON payment_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_severity ON payment_security_events(severity);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_client_ip ON payment_security_events(client_ip);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_resolved ON payment_security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_created_at ON payment_security_events(created_at);

-- 6. Create function to log payment audit events
CREATE OR REPLACE FUNCTION log_payment_audit(
  p_payment_id UUID,
  p_action TEXT,
  p_old_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_client_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO payment_audit_log (
    payment_id,
    action,
    old_status,
    new_status,
    amount,
    currency,
    user_id,
    client_ip,
    user_agent,
    metadata
  ) VALUES (
    p_payment_id,
    p_action,
    p_old_status,
    p_new_status,
    p_amount,
    p_currency,
    p_user_id,
    p_client_ip,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- 7. Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_client_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO payment_security_events (
    event_type,
    severity,
    client_ip,
    user_agent,
    user_id,
    payment_id,
    details
  ) VALUES (
    p_event_type,
    p_severity,
    p_client_ip,
    p_user_agent,
    p_user_id,
    p_payment_id,
    p_details
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- 8. Create trigger to automatically log payment status changes
CREATE OR REPLACE FUNCTION payment_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_payment_audit(
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      NEW.amount,
      NEW.currency,
      NEW.user_id,
      NEW.client_ip,
      NEW.user_agent,
      jsonb_build_object(
        'transaction_id', NEW.transaction_id,
        'payment_method', NEW.payment_method,
        'updated_at', NEW.updated_at
      )
    );
  END IF;
  
  -- Log payment creation
  IF TG_OP = 'INSERT' THEN
    PERFORM log_payment_audit(
      NEW.id,
      'created',
      NULL,
      NEW.status,
      NEW.amount,
      NEW.currency,
      NEW.user_id,
      NEW.client_ip,
      NEW.user_agent,
      jsonb_build_object(
        'payment_method', NEW.payment_method,
        'idempotency_key', NEW.idempotency_key
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS payment_audit_trigger ON payments;
CREATE TRIGGER payment_audit_trigger
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION payment_audit_trigger();

-- 9. Create views for monitoring
CREATE OR REPLACE VIEW payment_monitoring AS
SELECT 
  DATE(created_at) as payment_date,
  status,
  payment_method,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  COUNT(DISTINCT client_ip) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users
FROM payments 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), status, payment_method
ORDER BY payment_date DESC, status, payment_method;

CREATE OR REPLACE VIEW security_monitoring AS
SELECT 
  DATE(created_at) as event_date,
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT client_ip) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_count
FROM payment_security_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), event_type, severity
ORDER BY event_date DESC, severity DESC;

CREATE OR REPLACE VIEW webhook_monitoring AS
SELECT 
  DATE(created_at) as webhook_date,
  provider,
  status,
  COUNT(*) as webhook_count,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as error_count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
FROM payment_webhooks
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), provider, status
ORDER BY webhook_date DESC;

-- 10. Enable RLS on new tables
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_security_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access only
CREATE POLICY "Only admins can view payment audit logs" ON payment_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can view security events" ON payment_security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Service role can manage all security tables
CREATE POLICY "Service role can manage audit logs" ON payment_audit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rate limits" ON payment_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage security events" ON payment_security_events
  FOR ALL USING (auth.role() = 'service_role');

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON payment_monitoring TO authenticated;
GRANT SELECT ON security_monitoring TO authenticated;
GRANT SELECT ON webhook_monitoring TO authenticated;

-- Grant admin access to security tables
GRANT SELECT ON payment_audit_log TO authenticated;
GRANT SELECT ON payment_security_events TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Success message
SELECT 'Production security enhancements applied successfully!' as status;


