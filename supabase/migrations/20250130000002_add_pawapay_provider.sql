-- Add pawaPay as an allowed provider in payments table
-- This migration adds 'pawapay' to the existing provider check constraint

-- First, drop the existing constraint (may have different names)
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_provider_allowed;

ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_provider_check;

-- Recreate the constraint with pawaPay included
ALTER TABLE payments 
ADD CONSTRAINT payments_provider_allowed 
CHECK (provider IS NULL OR provider IN ('paydunya', 'stripe', 'pawapay'));

-- Add comment
COMMENT ON CONSTRAINT payments_provider_allowed ON payments IS 'Allowed payment providers: paydunya (legacy), stripe (cards), pawapay (mobile money)';

