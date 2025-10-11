-- Create FX rates table for caching live exchange rates
CREATE TABLE IF NOT EXISTS public.fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate_decimal DECIMAL(10,4) NOT NULL,
    source TEXT NOT NULL, -- 'XE', 'ExchangeRate-API', 'fallback', etc.
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fx_rates_currency_pair ON fx_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_fx_rates_active ON fx_rates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fx_rates_valid_from ON fx_rates(valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_fx_rates_compound ON fx_rates(from_currency, to_currency, is_active, valid_from DESC);

-- Constraint to ensure only one active rate per currency pair at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_fx_rates_unique_active 
ON fx_rates(from_currency, to_currency) 
WHERE is_active = true;

-- Add RLS policies
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage FX rates
CREATE POLICY "Service role can manage fx_rates" ON public.fx_rates
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read active rates
CREATE POLICY "Authenticated users can read active fx_rates" ON public.fx_rates
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Allow anonymous users to read active rates (for public API access)
CREATE POLICY "Anonymous users can read active fx_rates" ON public.fx_rates
    FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

-- Insert initial rate (will be updated by the fetch function)
-- Rate direction: from_currency='USD', to_currency='XOF', rate=566 means "1 USD = 566 XOF"
INSERT INTO public.fx_rates (
    from_currency, 
    to_currency, 
    rate_decimal, 
    source, 
    valid_from, 
    valid_until, 
    is_active,
    metadata
) VALUES (
    'USD', 
    'XOF', 
    566.00, 
    'initial', 
    now(), 
    now() + interval '2 hours', 
    true,
    '{"note": "Initial rate: 1 USD = 566 XOF, will be updated by fetch-fx-rates function"}'
) ON CONFLICT DO NOTHING;
