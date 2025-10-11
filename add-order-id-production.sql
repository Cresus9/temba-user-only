-- ===================================================================
-- ADD order_id COLUMN TO payments TABLE (Production Fix)
-- ===================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- This script is idempotent and safe to run multiple times

BEGIN;

-- Add order_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'order_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN order_id UUID NULL;
        
        RAISE NOTICE '✅ Added order_id column to payments table';
    ELSE
        RAISE NOTICE 'ℹ️  order_id column already exists in payments table';
    END IF;
END $$;

-- Create index on order_id for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'payments' 
        AND indexname = 'idx_payments_order_id'
    ) THEN
        CREATE INDEX idx_payments_order_id ON public.payments(order_id);
        RAISE NOTICE '✅ Created index on order_id column';
    ELSE
        RAISE NOTICE 'ℹ️  Index on order_id already exists';
    END IF;
END $$;

-- Notify PostgREST to reload schema cache (CRITICAL!)
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verify the column was added
SELECT 
    'payments table now has ' || count(*) || ' columns' as result,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'payments';

-- Specifically check order_id
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'payments' 
            AND column_name = 'order_id'
        ) THEN '✅ order_id column EXISTS'
        ELSE '❌ order_id column MISSING'
    END as verification;

