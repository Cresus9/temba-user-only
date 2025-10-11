-- Hybrid Payment System: Database Migration
-- Purpose: Add Stripe support alongside PayDunya
-- Date: 2025-10-11
-- Author: Development Team

-- ============================================
-- PART 1: Update payments table
-- ============================================

-- Add new columns for Stripe support
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('paydunya', 'stripe')),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS card_last4 TEXT,
ADD COLUMN IF NOT EXISTS card_brand TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS webhook_id UUID REFERENCES payment_webhooks(id),
ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ipn_data JSONB;

-- Add indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge ON payments(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_customer ON payments(stripe_customer_id);

-- Add comments
COMMENT ON COLUMN payments.provider IS 'Payment provider: paydunya (mobile money) or stripe (cards)';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON COLUMN payments.stripe_charge_id IS 'Stripe Charge ID';
COMMENT ON COLUMN payments.stripe_customer_id IS 'Stripe Customer ID for user';
COMMENT ON COLUMN payments.card_last4 IS 'Last 4 digits of card (for display)';
COMMENT ON COLUMN payments.card_brand IS 'Card brand: visa, mastercard, amex, etc';
COMMENT ON COLUMN payments.metadata IS 'Additional metadata from payment provider';

-- ============================================
-- PART 2: Create payment_webhooks table
-- ============================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('paydunya', 'stripe')),
  event_type TEXT NOT NULL,
  event_id TEXT UNIQUE,
  event_key TEXT NOT NULL,
  status TEXT NOT NULL,
  raw JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  client_ip TEXT,
  user_agent TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON payment_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_key ON payment_webhooks(event_key);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON payment_webhooks(created_at);

-- Add comments
COMMENT ON TABLE payment_webhooks IS 'Log of all payment webhook events from providers';
COMMENT ON COLUMN payment_webhooks.event_id IS 'Unique event ID from provider (for idempotency)';
COMMENT ON COLUMN payment_webhooks.event_key IS 'Reference key (payment token or invoice token)';
COMMENT ON COLUMN payment_webhooks.raw IS 'Full webhook payload for debugging';
COMMENT ON COLUMN payment_webhooks.processed IS 'Whether webhook has been processed successfully';

-- ============================================
-- PART 3: Update payment_methods table
-- ============================================

ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('paydunya', 'stripe')),
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_pm ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer ON payment_methods(stripe_customer_id);

-- Add comments
COMMENT ON COLUMN payment_methods.provider IS 'Payment provider for this method';
COMMENT ON COLUMN payment_methods.stripe_payment_method_id IS 'Stripe PaymentMethod ID';
COMMENT ON COLUMN payment_methods.stripe_customer_id IS 'Stripe Customer ID';

-- ============================================
-- PART 4: Update orders table (if needed)
-- ============================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('paydunya', 'stripe')),
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);

COMMENT ON COLUMN orders.payment_provider IS 'Which payment provider was used';
COMMENT ON COLUMN orders.payment_confirmed_at IS 'When payment was confirmed via webhook';

-- ============================================
-- PART 5: Data migration for existing records
-- ============================================

-- Mark all existing payments as PayDunya
UPDATE payments 
SET provider = 'paydunya' 
WHERE provider IS NULL;

-- Mark all existing mobile money payment methods as PayDunya
UPDATE payment_methods 
SET provider = 'paydunya' 
WHERE provider IS NULL AND method_type = 'mobile_money';

-- Mark existing card payment methods as PayDunya (will migrate to Stripe later)
UPDATE payment_methods 
SET provider = 'paydunya' 
WHERE provider IS NULL AND method_type = 'credit_card';

-- Update existing orders with payment provider
UPDATE orders o
SET payment_provider = 'paydunya'
WHERE payment_provider IS NULL
  AND EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.event_id = o.event_id 
    AND p.provider = 'paydunya'
  );

-- ============================================
-- PART 6: Create helper functions
-- ============================================

-- Function to get payment with provider info
CREATE OR REPLACE FUNCTION get_payment_with_provider(payment_id_param UUID)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  status TEXT,
  amount NUMERIC,
  currency TEXT,
  stripe_payment_intent_id TEXT,
  transaction_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.provider,
    p.status,
    p.amount,
    p.currency,
    p.stripe_payment_intent_id,
    p.transaction_id
  FROM payments p
  WHERE p.id = payment_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to log webhook events
CREATE OR REPLACE FUNCTION log_webhook_event(
  provider_param TEXT,
  event_type_param TEXT,
  event_id_param TEXT,
  event_key_param TEXT,
  status_param TEXT,
  raw_param JSONB,
  client_ip_param TEXT DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  webhook_id UUID;
BEGIN
  INSERT INTO payment_webhooks (
    provider,
    event_type,
    event_id,
    event_key,
    status,
    raw,
    client_ip,
    user_agent
  ) VALUES (
    provider_param,
    event_type_param,
    event_id_param,
    event_key_param,
    status_param,
    raw_param,
    client_ip_param,
    user_agent_param
  )
  RETURNING id INTO webhook_id;
  
  RETURN webhook_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: Create views for analytics
-- ============================================

-- View: Payment provider analytics
CREATE OR REPLACE VIEW payment_provider_analytics AS
SELECT 
  provider,
  COUNT(*) as total_payments,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
  SUM(amount) FILTER (WHERE status = 'completed') as total_revenue,
  AVG(amount) FILTER (WHERE status = 'completed') as avg_transaction_value,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate_percent
FROM payments
WHERE provider IS NOT NULL
GROUP BY provider;

COMMENT ON VIEW payment_provider_analytics IS 'Analytics comparing PayDunya vs Stripe performance';

-- View: Card vs Mobile Money breakdown
CREATE OR REPLACE VIEW payment_method_breakdown AS
SELECT 
  p.provider,
  p.payment_method,
  COUNT(*) as transaction_count,
  SUM(p.amount) FILTER (WHERE p.status = 'completed') as total_amount,
  AVG(p.amount) FILTER (WHERE p.status = 'completed') as avg_amount,
  COUNT(*) FILTER (WHERE p.status = 'completed') as successful_count,
  ROUND(
    COUNT(*) FILTER (WHERE p.status = 'completed')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate_percent
FROM payments p
WHERE p.provider IS NOT NULL
GROUP BY p.provider, p.payment_method
ORDER BY transaction_count DESC;

COMMENT ON VIEW payment_method_breakdown IS 'Breakdown by payment method and provider';

-- View: Recent webhook events
CREATE OR REPLACE VIEW recent_webhook_events AS
SELECT 
  w.id,
  w.provider,
  w.event_type,
  w.status,
  w.processed,
  w.error_message,
  w.created_at,
  p.id as payment_id,
  p.status as payment_status,
  p.amount as payment_amount
FROM payment_webhooks w
LEFT JOIN payments p ON (
  (w.provider = 'stripe' AND p.stripe_payment_intent_id = w.event_key) OR
  (w.provider = 'paydunya' AND p.transaction_id = w.event_key)
)
ORDER BY w.created_at DESC
LIMIT 100;

COMMENT ON VIEW recent_webhook_events IS 'Recent webhook events with payment info';

-- ============================================
-- PART 8: Add Row Level Security (RLS) policies
-- ============================================

-- Enable RLS on payment_webhooks (admin only)
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhooks
CREATE POLICY "Service role full access on payment_webhooks"
  ON payment_webhooks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view their own payments
CREATE POLICY "Users can view own payments with provider"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- PART 9: Grants and permissions
-- ============================================

-- Grant access to views
GRANT SELECT ON payment_provider_analytics TO authenticated;
GRANT SELECT ON payment_method_breakdown TO authenticated;
GRANT SELECT ON recent_webhook_events TO service_role;

-- ============================================
-- PART 10: Validation and health checks
-- ============================================

-- Check that all payments have a provider
DO $$
DECLARE
  null_provider_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_provider_count
  FROM payments
  WHERE provider IS NULL;
  
  IF null_provider_count > 0 THEN
    RAISE WARNING 'Found % payments without a provider', null_provider_count;
  ELSE
    RAISE NOTICE 'All payments have a provider assigned ✓';
  END IF;
END $$;

-- Check indexes exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_payments_stripe_intent'
  ) THEN
    RAISE NOTICE 'Stripe payment intent index exists ✓';
  ELSE
    RAISE WARNING 'Stripe payment intent index missing!';
  END IF;
END $$;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================

/*
-- To rollback this migration:

-- Drop views
DROP VIEW IF EXISTS recent_webhook_events;
DROP VIEW IF EXISTS payment_method_breakdown;
DROP VIEW IF EXISTS payment_provider_analytics;

-- Drop functions
DROP FUNCTION IF EXISTS log_webhook_event;
DROP FUNCTION IF EXISTS get_payment_with_provider;

-- Remove columns from orders
ALTER TABLE orders DROP COLUMN IF EXISTS payment_provider;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_confirmed_at;

-- Remove columns from payment_methods
ALTER TABLE payment_methods DROP COLUMN IF EXISTS provider;
ALTER TABLE payment_methods DROP COLUMN IF EXISTS stripe_payment_method_id;
ALTER TABLE payment_methods DROP COLUMN IF EXISTS stripe_customer_id;

-- Drop payment_webhooks table
DROP TABLE IF EXISTS payment_webhooks;

-- Remove columns from payments
ALTER TABLE payments DROP COLUMN IF EXISTS provider;
ALTER TABLE payments DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE payments DROP COLUMN IF EXISTS stripe_charge_id;
ALTER TABLE payments DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE payments DROP COLUMN IF EXISTS stripe_payment_method_id;
ALTER TABLE payments DROP COLUMN IF EXISTS card_last4;
ALTER TABLE payments DROP COLUMN IF EXISTS card_brand;
ALTER TABLE payments DROP COLUMN IF EXISTS metadata;
ALTER TABLE payments DROP COLUMN IF EXISTS webhook_id;
ALTER TABLE payments DROP COLUMN IF EXISTS last_webhook_at;
ALTER TABLE payments DROP COLUMN IF EXISTS ipn_data;
*/

-- ============================================
-- Migration complete!
-- ============================================

SELECT 'Hybrid payment migration completed successfully! ✓' as status;

