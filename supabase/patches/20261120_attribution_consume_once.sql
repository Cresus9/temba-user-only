-- Consume-once reseller attribution.
-- REVIEW ONLY. Do not run this against Temba-EU until the owner says so.
-- Does not change existing reward_ledger rows. Adds nullable order columns
-- and a guard in temba_internal.record_order_rewards so a stored code cannot
-- keep paying commission on later checkouts unless the buyer arrives with a
-- newer click (attribution_captured_at after the earlier credited order).
-- An event-specific click (attribution_event_id) must match the paid event.
--
-- Deploy create-stripe-payment and create-pawapay-payment after this patch,
-- so they can store the new columns. The website and app can ship first:
-- they already stop sending a consumed code.
--
-- Rollback: supabase/patches/20261120_attribution_consume_once_rollback.sql

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution_event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attribution_captured_at timestamptz;

COMMENT ON COLUMN public.orders.attribution_event_id IS
  'Event the ?r= click was for, when the link was event-specific. NULL means a generic link.';
COMMENT ON COLUMN public.orders.attribution_captured_at IS
  'Client-reported time of the click that produced this order''s attribution_code.';

CREATE OR REPLACE FUNCTION temba_internal.record_order_rewards(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'temba_internal', 'public'
AS $function$
DECLARE
  v public.orders%ROWTYPE;
  v_paid boolean := false;
  v_basis numeric := 0;
  v_amount numeric := 0;
  v_bonus numeric := 0;
  v_rate numeric := 0;
  v_min numeric := 500;
  v_available timestamptz;
  v_key text;
  v_event_reward numeric;
  v_reseller_user uuid;
  v_wrote integer := 0;
BEGIN
  SELECT * INTO v FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'skipped', 'order_missing');
  END IF;

  IF v.attribution_status IS DISTINCT FROM 'attributed' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no_attribution');
  END IF;

  IF v.status IS DISTINCT FROM 'COMPLETED' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not_completed');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.payments pay
    WHERE pay.order_id = v.id
      AND lower(pay.status::text) IN ('completed', 'succeeded', 'paid')
  ) INTO v_paid;

  IF NOT v_paid THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not_paid');
  END IF;

  v_basis := COALESCE(v.total, 0) + COALESCE(v.addons_total, 0);
  IF v_basis <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'zero_basis');
  END IF;

  v_available := temba_internal.reward_available_at(v);

  IF v.attribution_kind = 'user_referral' THEN
    IF NOT temba_internal.config_flag('program_enabled') THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'program_disabled', 'attributed', true);
    END IF;

    v_min := COALESCE(temba_internal.parse_numeric(public.get_config_value('min_purchase_amount')), 500);
    IF v_basis < v_min OR v.referrer_user_id IS NULL THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'below_minimum', 'basis', v_basis);
    END IF;

    SELECT s.referral_reward_amount INTO v_event_reward
    FROM public.event_commission_settings s
    WHERE s.event_id = v.event_id;

    v_amount := COALESCE(
      v_event_reward,
      temba_internal.parse_numeric(public.get_config_value('referrer_reward_amount'))
    );

    IF v_amount IS NOT NULL AND v_amount > 0 THEN
      IF v.user_id IS NOT NULL THEN
        v_key := 'referral_reward:' || v.referrer_user_id::text || ':' || v.user_id::text;
      ELSIF NULLIF(lower(btrim(COALESCE(v.guest_email, ''))), '') IS NOT NULL THEN
        v_key := 'referral_reward:' || v.referrer_user_id::text || ':guest:' || lower(btrim(v.guest_email));
      ELSE
        v_key := 'referral_reward:' || v.referrer_user_id::text || ':order:' || v.id::text;
      END IF;

      INSERT INTO public.reward_ledger (
        idempotency_key, order_id, event_id, beneficiary_user_id, buyer_user_id, guest_email,
        kind, amount, currency, status, available_at, basis_amount, metadata
      ) VALUES (
        v_key, v.id, v.event_id, v.referrer_user_id, v.user_id, v.guest_email,
        'referral_reward', round(v_amount, 0), 'XOF', 'pending', v_available, v_basis,
        jsonb_build_object('code', v.attribution_code)
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
      IF FOUND THEN
        v_wrote := v_wrote + 1;
      END IF;
    END IF;

    v_bonus := temba_internal.parse_numeric(public.get_config_value('referee_purchase_bonus'));
    IF v_bonus IS NOT NULL AND v_bonus > 0 AND v.user_id IS NOT NULL THEN
      INSERT INTO public.reward_ledger (
        idempotency_key, order_id, event_id, beneficiary_user_id, buyer_user_id,
        kind, amount, currency, status, available_at, basis_amount, metadata
      ) VALUES (
        'referee_bonus:' || v.user_id::text, v.id, v.event_id, v.user_id, v.user_id,
        'referee_bonus', round(v_bonus, 0), 'XOF', 'pending', v_available, v_basis,
        jsonb_build_object('code', v.attribution_code)
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
      IF FOUND THEN
        v_wrote := v_wrote + 1;
      END IF;
    END IF;

    RETURN jsonb_build_object('ok', true, 'wrote', v_wrote, 'kind', 'user_referral');
  END IF;

  IF v.attribution_kind = 'reseller' THEN
    IF NOT temba_internal.config_flag('reseller_program_enabled') THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'reseller_program_disabled', 'attributed', true);
    END IF;

    v_rate := temba_internal.commission_rate(v.attributed_reseller_code_id, v.attributed_reseller_id, v.event_id);
    v_amount := round(v_basis * COALESCE(v_rate, 0) / 100.0, 0);
    IF v_amount IS NULL OR v_amount <= 0 OR v.attributed_reseller_id IS NULL THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'zero_commission', 'rate', v_rate);
    END IF;

    IF v.attribution_event_id IS NOT NULL AND v.attribution_event_id IS DISTINCT FROM v.event_id THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'event_mismatch');
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.reward_ledger rl
      JOIN public.orders prev ON prev.id = rl.order_id
      WHERE rl.kind = 'reseller_commission'
        AND rl.status IN ('pending', 'available')
        AND prev.id IS DISTINCT FROM v.id
        AND temba_internal.normalize_code(prev.attribution_code)
          IS NOT DISTINCT FROM temba_internal.normalize_code(v.attribution_code)
        AND temba_internal.normalize_code(v.attribution_code) IS NOT NULL
        AND (
          (v.user_id IS NOT NULL AND (prev.user_id = v.user_id OR rl.buyer_user_id = v.user_id))
          OR (
            v.user_id IS NULL
            AND NULLIF(lower(btrim(COALESCE(v.guest_email, ''))), '') IS NOT NULL
            AND lower(btrim(COALESCE(prev.guest_email, ''))) = lower(btrim(v.guest_email))
          )
        )
        AND (
          v.attribution_captured_at IS NULL
          OR v.attribution_captured_at <= prev.created_at
        )
    ) THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'already_credited');
    END IF;

    SELECT r.user_id INTO v_reseller_user
    FROM public.resellers r WHERE r.id = v.attributed_reseller_id;

    INSERT INTO public.reward_ledger (
      idempotency_key, order_id, event_id, beneficiary_user_id, buyer_user_id, guest_email,
      reseller_id, reseller_code_id, kind, amount, currency, status, available_at,
      commission_rate, basis_amount, metadata
    ) VALUES (
      'reseller_commission:' || v.id::text, v.id, v.event_id, v_reseller_user, v.user_id, v.guest_email,
      v.attributed_reseller_id, v.attributed_reseller_code_id, 'reseller_commission', v_amount, 'XOF',
      'pending', v_available, v_rate, v_basis,
      jsonb_build_object('code', v.attribution_code)
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
    IF FOUND THEN
      v_wrote := 1;
    END IF;

    RETURN jsonb_build_object('ok', true, 'wrote', v_wrote, 'kind', 'reseller', 'amount', v_amount);
  END IF;

  RETURN jsonb_build_object('ok', true, 'skipped', 'unknown_kind');
END;
$function$;

COMMIT;
