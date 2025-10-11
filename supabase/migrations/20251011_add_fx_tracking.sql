-- =====================================================
-- FX Tracking for Multi-Currency Payments
-- =====================================================
-- Purpose: Track display currency (XOF) and charge currency (USD) separately
-- Date: 2025-10-11

-- 1. Add FX tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS display_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS charge_currency TEXT,
  ADD COLUMN IF NOT EXISTS charge_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS fx_rate_numerator BIGINT,
  ADD COLUMN IF NOT EXISTS fx_rate_denominator BIGINT,
  ADD COLUMN IF NOT EXISTS fx_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fx_margin_bps INT DEFAULT 150;

COMMENT ON COLUMN orders.display_currency IS 'Currency shown to user (XOF)';
COMMENT ON COLUMN orders.display_amount_minor IS 'Amount in XOF (no decimals)';
COMMENT ON COLUMN orders.charge_currency IS 'Currency charged by payment processor (USD for Stripe)';
COMMENT ON COLUMN orders.charge_amount_minor IS 'Amount in charge currency minor units (USD cents)';
COMMENT ON COLUMN orders.fx_rate_numerator IS 'FX rate numerator (avoids float errors)';
COMMENT ON COLUMN orders.fx_rate_denominator IS 'FX rate denominator (e.g., XOF per USD)';
COMMENT ON COLUMN orders.fx_locked_at IS 'When FX rate was locked for this order';
COMMENT ON COLUMN orders.fx_margin_bps IS 'FX margin in basis points (e.g., 150 = 1.5%)';

-- 2. Add FX tracking columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS display_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS charge_currency TEXT,
  ADD COLUMN IF NOT EXISTS charge_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS fx_rate_numerator BIGINT,
  ADD COLUMN IF NOT EXISTS fx_rate_denominator BIGINT,
  ADD COLUMN IF NOT EXISTS fx_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fx_margin_bps INT DEFAULT 150;

COMMENT ON COLUMN payments.display_currency IS 'Currency shown to user (XOF)';
COMMENT ON COLUMN payments.display_amount_minor IS 'Amount in XOF (no decimals)';
COMMENT ON COLUMN payments.charge_currency IS 'Currency charged by payment processor';
COMMENT ON COLUMN payments.charge_amount_minor IS 'Amount in charge currency minor units';
COMMENT ON COLUMN payments.fx_rate_numerator IS 'FX rate numerator';
COMMENT ON COLUMN payments.fx_rate_denominator IS 'FX rate denominator';
COMMENT ON COLUMN payments.fx_locked_at IS 'When FX rate was locked';
COMMENT ON COLUMN payments.fx_margin_bps IS 'FX margin in basis points';

-- 3. Create FX rates cache table
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate_numerator BIGINT NOT NULL,
  rate_denominator BIGINT NOT NULL,
  rate_decimal DECIMAL(20, 10) NOT NULL,
  source TEXT DEFAULT 'manual',
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_currencies ON fx_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_fx_rates_active ON fx_rates(is_active, valid_from);

COMMENT ON TABLE fx_rates IS 'Cached FX rates updated periodically';
COMMENT ON COLUMN fx_rates.rate_decimal IS 'Decimal rate for reference (1 USD = X XOF)';

-- 4. Insert initial XOF/USD rate
INSERT INTO fx_rates (
  from_currency,
  to_currency,
  rate_numerator,
  rate_denominator,
  rate_decimal,
  source,
  is_active
) VALUES (
  'XOF',
  'USD',
  100,
  165000,
  1650.00,
  'manual',
  true
) ON CONFLICT (from_currency, to_currency, valid_from) DO NOTHING;

COMMENT ON TABLE fx_rates IS '1 USD = 1650 XOF (adjust rate as needed)';

-- 5. Create view for current active rates
CREATE OR REPLACE VIEW active_fx_rates AS
SELECT 
  from_currency,
  to_currency,
  rate_numerator,
  rate_denominator,
  rate_decimal,
  valid_from,
  source
FROM fx_rates
WHERE is_active = true
  AND valid_from <= now()
  AND (valid_until IS NULL OR valid_until > now())
ORDER BY valid_from DESC;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_display_currency ON orders(display_currency);
CREATE INDEX IF NOT EXISTS idx_orders_charge_currency ON orders(charge_currency);
CREATE INDEX IF NOT EXISTS idx_payments_display_currency ON payments(display_currency);
CREATE INDEX IF NOT EXISTS idx_payments_charge_currency ON payments(charge_currency);

-- 7. Grant permissions
GRANT SELECT ON fx_rates TO authenticated, anon;
GRANT SELECT ON active_fx_rates TO authenticated, anon;
GRANT ALL ON fx_rates TO service_role;

-- Success message
SELECT 'FX tracking schema added successfully! ✅' as status;

