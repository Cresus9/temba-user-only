-- Create payment system tables and columns
-- This migration creates the necessary database structure for the Paydunya payment integration

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL,
    order_id uuid NULL,
    amount decimal(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'XOF',
    status varchar(20) NOT NULL DEFAULT 'pending',
    payment_method varchar(50) NOT NULL,
    transaction_id varchar(255) NULL, -- Paydunya transaction token
    token uuid NOT NULL DEFAULT gen_random_uuid(), -- Internal verification token
    completed_at timestamp with time zone NULL,
    failed_at timestamp with time zone NULL,
    amount_paid decimal(10,2) NULL,
    ipn_data jsonb NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    CONSTRAINT payments_payment_method_check CHECK (payment_method IN ('mobile_money', 'credit_card', 'bank_transfer'))
);

-- Create payment_webhooks table for IPN logging
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_id uuid NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    webhook_type varchar(50) NOT NULL DEFAULT 'paydunya_ipn',
    raw_data jsonb NOT NULL,
    processed boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT payment_webhooks_pkey PRIMARY KEY (id)
);

-- Add payment columns to tickets table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'payment_status') THEN
        ALTER TABLE public.tickets ADD COLUMN payment_status varchar(20) DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'payment_id') THEN
        ALTER TABLE public.tickets ADD COLUMN payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_token ON public.payments(token);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment_id ON public.payment_webhooks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON public.payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created_at ON public.payment_webhooks(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments table
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role can manage all payments" ON public.payments;
CREATE POLICY "Service role can manage all payments" ON public.payments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create RLS policies for payment_webhooks table
DROP POLICY IF EXISTS "Service role can manage all webhooks" ON public.payment_webhooks;
CREATE POLICY "Service role can manage all webhooks" ON public.payment_webhooks
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create updated_at trigger for payments table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.payment_webhooks TO service_role;

-- Comment on tables
COMMENT ON TABLE public.payments IS 'Stores payment transaction records for event ticket purchases';
COMMENT ON TABLE public.payment_webhooks IS 'Logs raw webhook/IPN data from payment providers for auditing';

-- Comment on important columns
COMMENT ON COLUMN public.payments.transaction_id IS 'External payment provider transaction ID (e.g., Paydunya token)';
COMMENT ON COLUMN public.payments.token IS 'Internal UUID token for payment verification and security';
COMMENT ON COLUMN public.payments.ipn_data IS 'Raw IPN/webhook data received from payment provider';
