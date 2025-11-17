-- =====================================================
-- Fix Free Ticket Status: ACTIVE -> VALID
-- =====================================================
-- This migration ensures all free tickets use 'VALID' status
-- for consistency with regular tickets

-- Update existing free tickets from ACTIVE to VALID
UPDATE tickets t
SET status = 'VALID', updated_at = NOW()
WHERE t.status = 'ACTIVE'
  AND EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.id = t.order_id 
      AND (o.payment_method ILIKE '%FREE%' OR o.total = 0 OR o.total IS NULL)
  );

-- Verify the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM tickets t
  INNER JOIN orders o ON t.order_id = o.id
  WHERE t.status = 'ACTIVE'
    AND (o.payment_method ILIKE '%FREE%' OR o.total = 0 OR o.total IS NULL);
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE 'Warning: % free tickets still have ACTIVE status', v_updated_count;
  ELSE
    RAISE NOTICE 'Success: All free tickets now have VALID status';
  END IF;
END $$;

