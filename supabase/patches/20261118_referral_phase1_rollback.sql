-- Rolls back 20261118_referral_phase1.sql.
-- Restores the previous reseller commission trigger body and the
-- credit_transactions insert policy. Does not delete orders or tickets.
-- Reward rows created by the patch are dropped with reward_ledger.
-- Run the whole file. Do not run it if you still want the new ledger.

BEGIN;

DROP TRIGGER IF EXISTS trg_sanitize_order_attribution ON public.orders;

CREATE OR REPLACE FUNCTION public.process_reseller_commission_on_order()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_code_record RECORD;
  v_reseller_record RECORD;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_default_rate NUMERIC := 8;
  v_inserted BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'CANCELLED'
     AND OLD.status IN ('COMPLETED', 'PAID')
     AND NEW.reseller_code IS NOT NULL
  THEN
    UPDATE reseller_commissions
    SET status = 'cancelled', updated_at = now()
    WHERE order_id = NEW.id
      AND status IN ('pending', 'approved')
    RETURNING true INTO v_inserted;

    IF v_inserted THEN
      UPDATE resellers r
      SET total_sales = GREATEST(COALESCE(r.total_sales, 0) - COALESCE(NEW.total, 0), 0),
          total_earned = GREATEST(COALESCE(r.total_earned, 0) - (
            SELECT COALESCE(commission_amount, 0) FROM reseller_commissions WHERE order_id = NEW.id LIMIT 1
          ), 0),
          updated_at = now()
      FROM reseller_commissions rc
      WHERE rc.order_id = NEW.id AND r.id = rc.reseller_id;

      UPDATE reseller_codes
      SET conversion_count = GREATEST(COALESCE(conversion_count, 0) - 1, 0),
          updated_at = now()
      WHERE code = NEW.reseller_code AND is_active = true;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status <> 'COMPLETED' OR NEW.reseller_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.total IS NULL OR NEW.total <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT rc.id, rc.reseller_id, rc.commission_rate_override, rc.is_active, rc.event_id
  INTO v_code_record
  FROM reseller_codes rc
  WHERE rc.code = NEW.reseller_code
  LIMIT 1;

  IF v_code_record IS NULL OR v_code_record.is_active = false THEN
    RETURN NEW;
  END IF;

  SELECT r.id, r.status, r.commission_rate
  INTO v_reseller_record
  FROM resellers r
  WHERE r.id = v_code_record.reseller_id
  LIMIT 1;

  IF v_reseller_record IS NULL OR v_reseller_record.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF v_code_record.event_id IS NOT NULL AND v_code_record.event_id <> NEW.event_id THEN
    RETURN NEW;
  END IF;

  IF v_code_record.event_id IS NULL AND NEW.event_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM reseller_event_authorizations
      WHERE reseller_id = v_reseller_record.id
        AND event_id = NEW.event_id
        AND is_active = true
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_code_record.commission_rate_override IS NOT NULL AND v_code_record.commission_rate_override > 0 THEN
    v_commission_rate := v_code_record.commission_rate_override;
  ELSIF v_reseller_record.commission_rate IS NOT NULL AND v_reseller_record.commission_rate > 0 THEN
    v_commission_rate := v_reseller_record.commission_rate;
  ELSE
    SELECT COALESCE(value::NUMERIC, 8)
    INTO v_default_rate
    FROM referral_config
    WHERE key = 'reseller_default_commission_rate'
    LIMIT 1;

    v_commission_rate := v_default_rate;
  END IF;

  v_commission_amount := (NEW.total * v_commission_rate) / 100;

  INSERT INTO reseller_commissions (
    id, reseller_id, reseller_code_id, order_id,
    sale_amount, commission_rate, commission_amount,
    status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_reseller_record.id,
    v_code_record.id,
    NEW.id,
    NEW.total,
    v_commission_rate,
    v_commission_amount,
    'pending',
    now(),
    now()
  )
  ON CONFLICT (order_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted THEN
    UPDATE reseller_codes
    SET conversion_count = COALESCE(conversion_count, 0) + 1,
        updated_at = now()
    WHERE id = v_code_record.id;

    UPDATE resellers
    SET total_sales = COALESCE(total_sales, 0) + NEW.total,
        total_earned = COALESCE(total_earned, 0) + v_commission_amount,
        updated_at = now()
    WHERE id = v_reseller_record.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Reseller commission processing failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_attributed_sales(integer);
DROP FUNCTION IF EXISTS public.get_my_referral_summary();
DROP FUNCTION IF EXISTS public.record_order_rewards(uuid);
DROP FUNCTION IF EXISTS public.reverse_order_rewards(uuid, text);
DROP FUNCTION IF EXISTS public.release_matured_rewards();
DROP FUNCTION IF EXISTS public.trg_sanitize_order_attribution();
DROP VIEW IF EXISTS public.attributed_sales;
DROP SCHEMA IF EXISTS temba_internal CASCADE;

DROP TABLE IF EXISTS public.reward_ledger;
DROP TABLE IF EXISTS public.order_attributions;
DROP TABLE IF EXISTS public.event_commission_settings;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_attribution_kind_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_attribution_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_referrer_user_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_attributed_reseller_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_attributed_reseller_code_id_fkey;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS attribution_code,
  DROP COLUMN IF EXISTS attribution_kind,
  DROP COLUMN IF EXISTS attribution_status,
  DROP COLUMN IF EXISTS attribution_block_reason,
  DROP COLUMN IF EXISTS referrer_user_id,
  DROP COLUMN IF EXISTS attributed_reseller_id,
  DROP COLUMN IF EXISTS attributed_reseller_code_id,
  DROP COLUMN IF EXISTS attribution_resolved_at;

DROP POLICY IF EXISTS "Users can insert own credit transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert own credit transactions"
  ON public.credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.credit_transactions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.user_credits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.referral_rewards TO anon, authenticated;

DELETE FROM public.referral_config WHERE key = 'attribution_hold_days_without_date';

UPDATE public.referral_config
SET value = '', updated_at = now()
WHERE key = 'referee_purchase_bonus'
  AND value = '0';

UPDATE public.reseller_commissions
SET status = 'pending', updated_at = now()
WHERE id IN (
  'f08afed7-af62-466d-b8d8-4969ee50f5e2',
  '624cf901-2a3e-490a-8205-20f56309ec5e',
  '8fbc24f5-a17e-498d-b75c-f37d68ed604d'
)
AND status = 'cancelled';

COMMIT;
