-- Ensure order_id column exists in payments table (idempotent)
-- This migration is safe to run multiple times

DO $$ 
BEGIN
    -- Add order_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'order_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN order_id UUID NULL;
        
        RAISE NOTICE 'Added order_id column to payments table';
    ELSE
        RAISE NOTICE 'order_id column already exists in payments table';
    END IF;
    
    -- Ensure index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND indexname = 'idx_payments_order_id'
    ) THEN
        CREATE INDEX idx_payments_order_id ON public.payments(order_id);
        RAISE NOTICE 'Created index on order_id column';
    ELSE
        RAISE NOTICE 'Index on order_id already exists';
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

