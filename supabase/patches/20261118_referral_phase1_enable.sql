-- Turn rewards on. Run ONLY after 20261118_referral_phase1.sql is applied
-- and the edge functions in docs/REFERRAL-PHASE1.md are deployed.
-- Until this runs, codes are stored but no reward row is written.
--
-- This does not pay historical orders. To replay orders that were paid
-- while the flags were off (optional, not required for new checkouts):
--
--   SELECT public.record_order_rewards(id)
--   FROM public.orders
--   WHERE status = 'COMPLETED'
--     AND attribution_status = 'attributed';

UPDATE public.referral_config
SET value = 'true', updated_at = now()
WHERE key IN ('program_enabled', 'reseller_program_enabled');
