-- Phase 1 referral + reseller attribution.
-- REVIEW ONLY. Do not run this against Temba-EU until the owner says so.
-- Nothing here deletes orders or tickets. With no code, order insert/update
-- takes the same early return it does today and no reward row is written.
--
-- Apply this file first, in one transaction (the SQL editor wraps a script).
-- Then deploy the functions listed in docs/REFERRAL-PHASE1.md.
-- Then, only when you want rewards to start, run
-- supabase/patches/20261118_referral_phase1_enable.sql
--
-- Rollback: supabase/patches/20261118_referral_phase1_rollback.sql

BEGIN;

CREATE SCHEMA IF NOT EXISTS temba_internal;
REVOKE ALL ON SCHEMA temba_internal FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA temba_internal TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- Orders: nullable attribution columns. Existing rows stay NULL.
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution_code text,
  ADD COLUMN IF NOT EXISTS attribution_kind text,
  ADD COLUMN IF NOT EXISTS attribution_status text,
  ADD COLUMN IF NOT EXISTS attribution_block_reason text,
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS attributed_reseller_id uuid,
  ADD COLUMN IF NOT EXISTS attributed_reseller_code_id uuid,
  ADD COLUMN IF NOT EXISTS attribution_resolved_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_attribution_kind_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_attribution_kind_check
      CHECK (attribution_kind IS NULL OR attribution_kind IN ('user_referral', 'reseller'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_attribution_status_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_attribution_status_check
      CHECK (attribution_status IS NULL OR attribution_status IN ('attributed', 'blocked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_referrer_user_id_fkey') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_referrer_user_id_fkey
      FOREIGN KEY (referrer_user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_attributed_reseller_id_fkey') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_attributed_reseller_id_fkey
      FOREIGN KEY (attributed_reseller_id) REFERENCES public.resellers (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_attributed_reseller_code_id_fkey') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_attributed_reseller_code_id_fkey
      FOREIGN KEY (attributed_reseller_code_id) REFERENCES public.reseller_codes (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_attribution_code_idx
  ON public.orders (attribution_code) WHERE attribution_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_referrer_user_id_idx
  ON public.orders (referrer_user_id) WHERE referrer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_attributed_reseller_id_idx
  ON public.orders (attributed_reseller_id) WHERE attributed_reseller_id IS NOT NULL;

COMMENT ON COLUMN public.orders.attribution_code IS
  'Candidate code from ?r= (legacy ?ref=). The server resolves it. Not a reward by itself.';

-- ---------------------------------------------------------------------------
-- Per-event commission. Empty until an admin sets a rate.
-- Priority at payout time: code override (>0), this rate (including 0),
-- reseller.commission_rate (>0), referral_config.reseller_default_commission_rate.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_commission_settings (
  event_id uuid PRIMARY KEY REFERENCES public.events (id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  referral_reward_amount numeric CHECK (referral_reward_amount IS NULL OR referral_reward_amount >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.event_commission_settings IS
  'Per-event reseller commission and optional flat referral reward. Phase 2 admin writes this.';

-- ---------------------------------------------------------------------------
-- One attribution decision per order.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_attributions (
  order_id uuid PRIMARY KEY REFERENCES public.orders (id) ON DELETE CASCADE,
  code text NOT NULL,
  kind text CHECK (kind IS NULL OR kind IN ('user_referral', 'reseller')),
  status text NOT NULL CHECK (status IN ('attributed', 'blocked')),
  block_reason text,
  referrer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reseller_id uuid REFERENCES public.resellers (id) ON DELETE SET NULL,
  reseller_code_id uuid REFERENCES public.reseller_codes (id) ON DELETE SET NULL,
  buyer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_attributions_referrer_idx
  ON public.order_attributions (referrer_user_id) WHERE referrer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_attributions_reseller_idx
  ON public.order_attributions (reseller_id) WHERE reseller_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Append-only reward ledger. Idempotency key stops webhook replays
-- from paying twice. Reversals are new rows, not deleted history.
-- Pending until the day after the event. Not spendable at checkout.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  beneficiary_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  buyer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  guest_email text,
  reseller_id uuid REFERENCES public.resellers (id) ON DELETE SET NULL,
  reseller_code_id uuid REFERENCES public.reseller_codes (id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('referral_reward', 'referee_bonus', 'reseller_commission', 'reversal')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'reversed', 'void')),
  available_at timestamptz NOT NULL,
  reverses_entry_id uuid REFERENCES public.reward_ledger (id),
  commission_rate numeric,
  basis_amount numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reward_ledger_order_idx ON public.reward_ledger (order_id);
CREATE INDEX IF NOT EXISTS reward_ledger_beneficiary_idx
  ON public.reward_ledger (beneficiary_user_id, status);
CREATE INDEX IF NOT EXISTS reward_ledger_reseller_idx
  ON public.reward_ledger (reseller_id, status) WHERE reseller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reward_ledger_pending_idx
  ON public.reward_ledger (available_at) WHERE status = 'pending';

COMMENT ON TABLE public.reward_ledger IS
  'Server-owned referral rewards and reseller commissions. Users can read their own rows. Writes are service_role / trigger only.';

-- ---------------------------------------------------------------------------
-- Pure helpers. decide_attribution matches src/lib/attribution/rules.ts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION temba_internal.normalize_code(p_code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = temba_internal, public
AS $$
DECLARE
  v text := upper(btrim(COALESCE(p_code, '')));
BEGIN
  IF v = '' OR v !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' THEN
    RETURN NULL;
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.parse_numeric(p_value text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = temba_internal, public
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN btrim(p_value)::numeric;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.config_flag(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = temba_internal, public
AS $$
  SELECT lower(btrim(COALESCE(public.get_config_value(p_key), ''))) IN ('true', 't', '1', 'yes');
$$;

CREATE OR REPLACE FUNCTION temba_internal.phone_tail(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN length(regexp_replace(COALESCE(p_value, ''), '\D', '', 'g')) >= 8
      THEN right(regexp_replace(COALESCE(p_value, ''), '\D', '', 'g'), 8)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.decide_attribution(
  p_has_user boolean,
  p_has_reseller boolean,
  p_reseller_valid boolean,
  p_reseller_reason text,
  p_buyer uuid,
  p_referrer uuid,
  p_reseller_user uuid,
  p_guest_email text,
  p_referrer_email text,
  p_reseller_email text,
  p_referrer_phone text,
  p_reseller_phone text,
  OUT status text,
  OUT kind text,
  OUT reason text
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = temba_internal, public
AS $$
DECLARE
  v_guest text := NULLIF(lower(btrim(COALESCE(p_guest_email, ''))), '');
  v_ref_email text := NULLIF(lower(btrim(COALESCE(p_referrer_email, ''))), '');
  v_res_email text := NULLIF(lower(btrim(COALESCE(p_reseller_email, ''))), '');
  v_guest_phone text := NULL;
BEGIN
  IF v_guest LIKE '%@temba.temp' THEN
    v_guest_phone := temba_internal.phone_tail(split_part(v_guest, '@', 1));
    v_guest := NULL;
  END IF;
  IF v_ref_email LIKE '%@temba.temp' THEN
    v_ref_email := NULL;
  END IF;
  IF v_res_email LIKE '%@temba.temp' THEN
    v_res_email := NULL;
  END IF;

  IF COALESCE(p_has_user, false) AND COALESCE(p_has_reseller, false) THEN
    status := 'blocked'; kind := NULL; reason := 'ambiguous_code'; RETURN;
  END IF;

  IF COALESCE(p_has_reseller, false) THEN
    IF NOT COALESCE(p_reseller_valid, false) THEN
      status := 'blocked';
      kind := NULL;
      reason := COALESCE(NULLIF(btrim(COALESCE(p_reseller_reason, '')), ''), 'invalid_reseller_code');
      RETURN;
    END IF;
    IF p_buyer IS NOT NULL AND p_reseller_user IS NOT NULL AND p_buyer = p_reseller_user THEN
      status := 'blocked'; kind := NULL; reason := 'self_referral'; RETURN;
    END IF;
    IF p_buyer IS NULL AND v_guest IS NOT NULL AND v_res_email IS NOT NULL AND v_guest = v_res_email THEN
      status := 'blocked'; kind := NULL; reason := 'self_referral'; RETURN;
    END IF;
    IF p_buyer IS NULL AND v_guest_phone IS NOT NULL
       AND temba_internal.phone_tail(p_reseller_phone) IS NOT DISTINCT FROM v_guest_phone THEN
      status := 'blocked'; kind := NULL; reason := 'self_referral'; RETURN;
    END IF;
    status := 'attributed'; kind := 'reseller'; reason := NULL; RETURN;
  END IF;

  IF COALESCE(p_has_user, false) THEN
    IF p_buyer IS NOT NULL AND p_referrer IS NOT NULL AND p_buyer = p_referrer THEN
      status := 'blocked'; kind := NULL; reason := 'self_referral'; RETURN;
    END IF;
    IF p_buyer IS NULL AND v_guest IS NOT NULL AND v_ref_email IS NOT NULL AND v_guest = v_ref_email THEN
      status := 'blocked'; kind := NULL; reason := 'self_referral'; RETURN;
    END IF;
    IF p_buyer IS NULL AND v_guest_phone IS NOT NULL
       AND temba_internal.phone_tail(p_referrer_phone) IS NOT DISTINCT FROM v_guest_phone THEN
      status := 'blocked'; kind := NULL; reason := 'self_referral'; RETURN;
    END IF;
    status := 'attributed'; kind := 'user_referral'; reason := NULL; RETURN;
  END IF;

  status := 'blocked'; kind := NULL; reason := 'unknown_code';
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.commission_rate(
  p_code_id uuid,
  p_reseller_id uuid,
  p_event_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = temba_internal, public
AS $$
DECLARE
  v_override numeric;
  v_event numeric;
  v_reseller numeric;
  v_default numeric;
BEGIN
  IF p_code_id IS NOT NULL THEN
    SELECT commission_rate_override INTO v_override
    FROM public.reseller_codes WHERE id = p_code_id;
    IF v_override IS NOT NULL AND v_override > 0 THEN
      RETURN v_override;
    END IF;
  END IF;

  IF p_event_id IS NOT NULL THEN
    SELECT commission_rate INTO v_event
    FROM public.event_commission_settings WHERE event_id = p_event_id;
    IF v_event IS NOT NULL THEN
      RETURN v_event;
    END IF;
  END IF;

  IF p_reseller_id IS NOT NULL THEN
    SELECT commission_rate INTO v_reseller
    FROM public.resellers WHERE id = p_reseller_id;
    IF v_reseller IS NOT NULL AND v_reseller > 0 THEN
      RETURN v_reseller;
    END IF;
  END IF;

  v_default := temba_internal.parse_numeric(public.get_config_value('reseller_default_commission_rate'));
  RETURN COALESCE(v_default, 8);
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.reward_available_at(p_order public.orders)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = temba_internal, public
AS $$
DECLARE
  v_event_date date;
  v_visit date;
  v_tz text := 'Africa/Ouagadougou';
  v_days integer;
  v_date date;
BEGIN
  SELECT e.date, COALESCE(NULLIF(btrim(e.timezone), ''), 'Africa/Ouagadougou')
  INTO v_event_date, v_tz
  FROM public.events e
  WHERE e.id = p_order.event_id;

  SELECT max(ed.date) INTO v_visit
  FROM public.event_dates ed
  WHERE ed.event_id = p_order.event_id
    AND (
      ed.id = p_order.event_date_id
      OR (
        jsonb_typeof(p_order.line_allocations) = 'array'
        AND ed.id IN (
          SELECT (x->>'event_date_id')::uuid
          FROM jsonb_array_elements(p_order.line_allocations) x
          WHERE COALESCE(x->>'event_date_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
      )
    );

  v_date := COALESCE(v_visit, v_event_date);
  IF v_date IS NULL THEN
    v_days := COALESCE(
      temba_internal.parse_numeric(public.get_config_value('attribution_hold_days_without_date'))::integer,
      7
    );
    IF v_days < 0 THEN
      v_days := 7;
    END IF;
    RETURN now() + make_interval(days => v_days);
  END IF;

  BEGIN
    RETURN (v_date + 1)::timestamp AT TIME ZONE v_tz;
  EXCEPTION WHEN OTHERS THEN
    RETURN (v_date + 1)::timestamp AT TIME ZONE 'Africa/Ouagadougou';
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- Resolve a code onto the order row. Never trusts a client-supplied user id.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION temba_internal.apply_attribution(
  p public.orders,
  p_old public.orders,
  p_op text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
DECLARE
  v_code text;
  v_user_id uuid;
  v_user_email text;
  v_user_phone text;
  v_reseller_id uuid;
  v_reseller_code_id uuid;
  v_reseller_user uuid;
  v_reseller_email text;
  v_reseller_phone text;
  v_user_exists boolean := false;
  v_reseller_exists boolean := false;
  v_valid boolean := false;
  v_reason text;
  v_status text;
  v_kind text;
  v_block text;
BEGIN
  IF p_op = 'UPDATE' AND p_old.id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reward_ledger rl
    WHERE rl.order_id = p.id AND rl.kind <> 'reversal'
  ) THEN
    p.attribution_code := p_old.attribution_code;
    p.attribution_kind := p_old.attribution_kind;
    p.attribution_status := p_old.attribution_status;
    p.attribution_block_reason := p_old.attribution_block_reason;
    p.referrer_user_id := p_old.referrer_user_id;
    p.attributed_reseller_id := p_old.attributed_reseller_id;
    p.attributed_reseller_code_id := p_old.attributed_reseller_code_id;
    p.attribution_resolved_at := p_old.attribution_resolved_at;
    p.reseller_code := p_old.reseller_code;
    RETURN p;
  END IF;

  v_code := temba_internal.normalize_code(COALESCE(p.attribution_code, p.reseller_code));

  IF v_code IS NULL THEN
    p.attribution_code := NULL;
    p.attribution_kind := NULL;
    p.attribution_status := NULL;
    p.attribution_block_reason := NULL;
    p.referrer_user_id := NULL;
    p.attributed_reseller_id := NULL;
    p.attributed_reseller_code_id := NULL;
    p.attribution_resolved_at := NULL;
    p.reseller_code := NULL;
    RETURN p;
  END IF;

  IF p_op = 'UPDATE'
     AND p_old.attribution_resolved_at IS NOT NULL
     AND temba_internal.normalize_code(COALESCE(p_old.attribution_code, p_old.reseller_code)) IS NOT DISTINCT FROM v_code
  THEN
    p.attribution_code := p_old.attribution_code;
    p.attribution_kind := p_old.attribution_kind;
    p.attribution_status := p_old.attribution_status;
    p.attribution_block_reason := p_old.attribution_block_reason;
    p.referrer_user_id := p_old.referrer_user_id;
    p.attributed_reseller_id := p_old.attributed_reseller_id;
    p.attributed_reseller_code_id := p_old.attributed_reseller_code_id;
    p.attribution_resolved_at := p_old.attribution_resolved_at;
    p.reseller_code := p_old.reseller_code;
    RETURN p;
  END IF;

  SELECT c.user_id, pr.email, pr.phone
  INTO v_user_id, v_user_email, v_user_phone
  FROM public.user_referral_codes c
  LEFT JOIN public.profiles pr ON pr.user_id = c.user_id
  WHERE upper(btrim(c.referral_code)) = v_code
    AND COALESCE(c.is_active, true)
  LIMIT 1;
  v_user_exists := FOUND;

  SELECT rc.id, rc.reseller_id, r.user_id, pr.email, pr.phone
  INTO v_reseller_code_id, v_reseller_id, v_reseller_user, v_reseller_email, v_reseller_phone
  FROM public.reseller_codes rc
  JOIN public.resellers r ON r.id = rc.reseller_id
  LEFT JOIN public.profiles pr ON pr.user_id = r.user_id
  WHERE upper(btrim(rc.code)) = v_code
  LIMIT 1;
  v_reseller_exists := FOUND;

  IF v_reseller_exists THEN
    SELECT v.valid, v.reason INTO v_valid, v_reason
    FROM public.validate_reseller_code_for_event(v_code, p.event_id) AS v;
  END IF;

  SELECT d.status, d.kind, d.reason
  INTO v_status, v_kind, v_block
  FROM temba_internal.decide_attribution(
    v_user_exists,
    v_reseller_exists,
    v_valid,
    v_reason,
    p.user_id,
    v_user_id,
    v_reseller_user,
    p.guest_email,
    v_user_email,
    v_reseller_email,
    v_user_phone,
    v_reseller_phone
  ) AS d;

  p.attribution_code := v_code;
  p.attribution_resolved_at := now();
  p.attribution_status := v_status;
  p.attribution_block_reason := v_block;
  p.attribution_kind := NULL;
  p.referrer_user_id := NULL;
  p.attributed_reseller_id := NULL;
  p.attributed_reseller_code_id := NULL;
  p.reseller_code := NULL;

  IF v_status = 'attributed' AND v_kind = 'user_referral' THEN
    p.attribution_kind := 'user_referral';
    p.referrer_user_id := v_user_id;
  ELSIF v_status = 'attributed' AND v_kind = 'reseller' THEN
    p.attribution_kind := 'reseller';
    p.attributed_reseller_id := v_reseller_id;
    p.attributed_reseller_code_id := v_reseller_code_id;
    p.reseller_code := v_code;
  END IF;

  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.persist_attribution(p public.orders)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  IF p.attribution_status IS NULL OR p.attribution_code IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.order_attributions (
    order_id, code, kind, status, block_reason,
    referrer_user_id, reseller_id, reseller_code_id,
    buyer_user_id, event_id, resolved_at, updated_at
  ) VALUES (
    p.id, p.attribution_code, p.attribution_kind, p.attribution_status, p.attribution_block_reason,
    p.referrer_user_id, p.attributed_reseller_id, p.attributed_reseller_code_id,
    p.user_id, p.event_id, COALESCE(p.attribution_resolved_at, now()), now()
  )
  ON CONFLICT (order_id) DO UPDATE SET
    code = EXCLUDED.code,
    kind = EXCLUDED.kind,
    status = EXCLUDED.status,
    block_reason = EXCLUDED.block_reason,
    referrer_user_id = EXCLUDED.referrer_user_id,
    reseller_id = EXCLUDED.reseller_id,
    reseller_code_id = EXCLUDED.reseller_code_id,
    buyer_user_id = EXCLUDED.buyer_user_id,
    event_id = EXCLUDED.event_id,
    resolved_at = EXCLUDED.resolved_at,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.record_order_rewards(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION temba_internal.reverse_order_rewards(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  INSERT INTO public.reward_ledger (
    idempotency_key, order_id, event_id, beneficiary_user_id, buyer_user_id, guest_email,
    reseller_id, reseller_code_id, kind, amount, currency, status, available_at,
    reverses_entry_id, commission_rate, basis_amount, metadata
  )
  SELECT
    'reversal:' || rl.idempotency_key,
    rl.order_id,
    rl.event_id,
    rl.beneficiary_user_id,
    rl.buyer_user_id,
    rl.guest_email,
    rl.reseller_id,
    rl.reseller_code_id,
    'reversal',
    -rl.amount,
    rl.currency,
    'reversed',
    now(),
    rl.id,
    rl.commission_rate,
    rl.basis_amount,
    jsonb_build_object('reason', COALESCE(p_reason, 'reversal'), 'reverses', rl.idempotency_key)
  FROM public.reward_ledger rl
  WHERE rl.order_id = p_order_id
    AND rl.kind <> 'reversal'
    AND rl.status IN ('pending', 'available')
  ON CONFLICT (idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.reward_ledger rl
  SET status = 'reversed', updated_at = now()
  WHERE rl.order_id = p_order_id
    AND rl.kind <> 'reversal'
    AND rl.status IN ('pending', 'available')
    AND EXISTS (
      SELECT 1 FROM public.reward_ledger rev
      WHERE rev.idempotency_key = 'reversal:' || rl.idempotency_key
    );

  RETURN jsonb_build_object('ok', true, 'reversals', v_inserted);
END;
$$;

CREATE OR REPLACE FUNCTION temba_internal.handle_order_attribution_trigger(
  p_new public.orders,
  p_old public.orders,
  p_op text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  PERFORM temba_internal.persist_attribution(p_new);

  IF p_new.attribution_status IS DISTINCT FROM 'attributed' THEN
    IF p_op = 'UPDATE'
       AND p_new.status IN ('CANCELLED', 'EXPIRED')
       AND p_old.status = 'COMPLETED' THEN
      PERFORM temba_internal.reverse_order_rewards(p_new.id, 'order_' || lower(p_new.status));
    END IF;
    RETURN;
  END IF;

  IF p_op = 'INSERT' AND p_new.status = 'COMPLETED' THEN
    PERFORM temba_internal.record_order_rewards(p_new.id);
  ELSIF p_op = 'UPDATE'
        AND p_new.status = 'COMPLETED'
        AND p_old.status IS DISTINCT FROM 'COMPLETED' THEN
    PERFORM temba_internal.record_order_rewards(p_new.id);
  ELSIF p_op = 'UPDATE'
        AND p_new.status IN ('CANCELLED', 'EXPIRED')
        AND p_old.status = 'COMPLETED' THEN
    PERFORM temba_internal.reverse_order_rewards(p_new.id, 'order_' || lower(p_new.status));
  END IF;
END;
$$;

-- Optional. Reads already treat a pending row as available once available_at has passed.
CREATE OR REPLACE FUNCTION temba_internal.release_matured_rewards()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.reward_ledger
  SET status = 'available', updated_at = now()
  WHERE status = 'pending'
    AND available_at <= now()
    AND kind <> 'reversal';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers. The no-code path returns before any lookup.
-- The existing commission trigger keeps its name. Its body no longer inserts
-- reseller_commissions (that table double-paid unpaid orders). New sales
-- land in reward_ledger, still inside the order status transaction.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_sanitize_order_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NULLIF(btrim(COALESCE(NEW.attribution_code, '')), '') IS NULL
     AND NULLIF(btrim(COALESCE(NEW.reseller_code, '')), '') IS NULL
     AND NEW.referrer_user_id IS NULL
     AND NEW.attributed_reseller_id IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NULLIF(btrim(COALESCE(NEW.attribution_code, '')), '') IS NULL
     AND NULLIF(btrim(COALESCE(NEW.reseller_code, '')), '') IS NULL
     AND NEW.referrer_user_id IS NULL
     AND NEW.attributed_reseller_id IS NULL
     AND OLD.attribution_resolved_at IS NULL
     AND OLD.referrer_user_id IS NULL
     AND OLD.attributed_reseller_id IS NULL
     AND NULLIF(btrim(COALESCE(OLD.attribution_code, '')), '') IS NULL
     AND NULLIF(btrim(COALESCE(OLD.reseller_code, '')), '') IS NULL
  THEN
    RETURN NEW;
  END IF;

  NEW := temba_internal.apply_attribution(NEW, CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END, TG_OP);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'attribution sanitize failed for order %: %', NEW.id, SQLERRM;
  NEW.attribution_code := NULL;
  NEW.attribution_kind := NULL;
  NEW.attribution_status := NULL;
  NEW.attribution_block_reason := NULL;
  NEW.referrer_user_id := NULL;
  NEW.attributed_reseller_id := NULL;
  NEW.attributed_reseller_code_id := NULL;
  NEW.attribution_resolved_at := NULL;
  NEW.reseller_code := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_order_attribution ON public.orders;
CREATE TRIGGER trg_sanitize_order_attribution
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sanitize_order_attribution();

CREATE OR REPLACE FUNCTION public.process_reseller_commission_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.attribution_status IS NULL
     AND NULLIF(btrim(COALESCE(NEW.reseller_code, '')), '') IS NULL
     AND NULLIF(btrim(COALESCE(NEW.attribution_code, '')), '') IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.attribution_status IS NULL
     AND OLD.attribution_status IS NULL
     AND NULLIF(btrim(COALESCE(NEW.reseller_code, '')), '') IS NULL
     AND NULLIF(btrim(COALESCE(OLD.reseller_code, '')), '') IS NULL
  THEN
    RETURN NEW;
  END IF;

  PERFORM temba_internal.handle_order_attribution_trigger(
    NEW,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD ELSE NULL END,
    TG_OP
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'attribution trigger failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Read APIs. Writes stay on service_role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_order_rewards(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  RETURN temba_internal.record_order_rewards(p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_order_rewards(p_order_id uuid, p_reason text DEFAULT 'reversal')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  RETURN temba_internal.reverse_order_rewards(p_order_id, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_matured_rewards()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = temba_internal, public
AS $$
BEGIN
  RETURN temba_internal.release_matured_rewards();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'code', NULL, 'link', NULL,
      'pending_amount', 0, 'available_amount', 0, 'currency', 'XOF'
    );
  END IF;

  SELECT referral_code INTO v_code
  FROM public.user_referral_codes
  WHERE user_id = v_uid AND COALESCE(is_active, true)
  LIMIT 1;

  RETURN jsonb_build_object(
    'code', v_code,
    'link', CASE WHEN v_code IS NULL THEN NULL ELSE 'https://tembas.com/?r=' || v_code END,
    'pending_amount', COALESCE((
      SELECT sum(amount) FROM public.reward_ledger
      WHERE beneficiary_user_id = v_uid
        AND status = 'pending'
        AND available_at > now()
    ), 0),
    'available_amount', COALESCE((
      SELECT sum(amount) FROM public.reward_ledger
      WHERE beneficiary_user_id = v_uid
        AND (status = 'available' OR (status = 'pending' AND available_at <= now()))
    ), 0),
    'currency', 'XOF'
  );
END;
$$;

CREATE OR REPLACE VIEW public.attributed_sales
WITH (security_invoker = true) AS
SELECT
  rl.id,
  rl.order_id,
  rl.event_id,
  rl.kind,
  rl.amount,
  rl.currency,
  rl.status,
  CASE
    WHEN rl.status = 'pending' AND rl.available_at <= now() THEN 'available'
    ELSE rl.status
  END AS effective_status,
  rl.available_at,
  rl.commission_rate,
  rl.basis_amount,
  rl.beneficiary_user_id,
  rl.reseller_id,
  oa.code AS attribution_code,
  oa.kind AS attribution_kind,
  rl.created_at
FROM public.reward_ledger rl
LEFT JOIN public.order_attributions oa ON oa.order_id = rl.order_id
WHERE rl.kind <> 'reversal';

COMMENT ON VIEW public.attributed_sales IS
  'security_invoker. Rows are limited by reward_ledger RLS to the caller, their reseller account, or an admin.';

CREATE OR REPLACE FUNCTION public.get_attributed_sales(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  order_id uuid,
  event_id uuid,
  event_title text,
  kind text,
  amount numeric,
  currency text,
  status text,
  effective_status text,
  available_at timestamptz,
  commission_rate numeric,
  basis_amount numeric,
  attribution_code text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(COALESCE(p_limit, 50), 1), 200);
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    rl.id,
    rl.order_id,
    rl.event_id,
    e.title,
    rl.kind,
    rl.amount,
    rl.currency,
    rl.status,
    CASE
      WHEN rl.status = 'pending' AND rl.available_at <= now() THEN 'available'
      ELSE rl.status
    END,
    rl.available_at,
    rl.commission_rate,
    rl.basis_amount,
    oa.code,
    rl.created_at
  FROM public.reward_ledger rl
  LEFT JOIN public.events e ON e.id = rl.event_id
  LEFT JOIN public.order_attributions oa ON oa.order_id = rl.order_id
  WHERE rl.kind <> 'reversal'
    AND (
      public.is_admin(v_uid)
      OR rl.beneficiary_user_id = v_uid
      OR rl.reseller_id IN (SELECT r.id FROM public.resellers r WHERE r.user_id = v_uid)
    )
  ORDER BY rl.created_at DESC
  LIMIT v_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS. Read own rows. No insert/update/delete policies for authenticated.
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_commission_settings_admin_all ON public.event_commission_settings;
CREATE POLICY event_commission_settings_admin_all
  ON public.event_commission_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS order_attributions_select_own ON public.order_attributions;
CREATE POLICY order_attributions_select_own
  ON public.order_attributions
  FOR SELECT
  TO authenticated
  USING (
    buyer_user_id = auth.uid()
    OR referrer_user_id = auth.uid()
    OR reseller_id IN (SELECT r.id FROM public.resellers r WHERE r.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS reward_ledger_select_own ON public.reward_ledger;
CREATE POLICY reward_ledger_select_own
  ON public.reward_ledger
  FOR SELECT
  TO authenticated
  USING (
    beneficiary_user_id = auth.uid()
    OR (buyer_user_id = auth.uid() AND kind = 'referee_bonus')
    OR reseller_id IN (SELECT r.id FROM public.resellers r WHERE r.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

GRANT SELECT ON public.event_commission_settings, public.order_attributions, public.reward_ledger, public.attributed_sales
  TO authenticated;
GRANT ALL ON public.event_commission_settings, public.order_attributions, public.reward_ledger
  TO service_role;
GRANT SELECT ON public.attributed_sales TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.event_commission_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.order_attributions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.reward_ledger FROM anon, authenticated;
REVOKE ALL ON public.reward_ledger FROM anon;
REVOKE ALL ON public.order_attributions FROM anon;
REVOKE ALL ON public.event_commission_settings FROM anon;

-- Existing ledgers: users could insert their own credit_transactions, and
-- authenticated/anon also had TRUNCATE. Trigger update_user_credits is
-- SECURITY DEFINER, so service_role and the trigger can still write.
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON public.credit_transactions;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.credit_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_credits FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.referral_rewards FROM anon, authenticated;

GRANT SELECT ON public.credit_transactions, public.user_credits, public.referral_rewards TO anon, authenticated;

REVOKE ALL ON FUNCTION public.record_order_rewards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_order_rewards(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_matured_rewards() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_rewards(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_order_rewards(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_matured_rewards() TO service_role;

REVOKE ALL ON FUNCTION public.trg_sanitize_order_attribution() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_sanitize_order_attribution() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_reseller_commission_on_order() TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.trg_sanitize_order_attribution() TO supabase_admin;
    GRANT EXECUTE ON FUNCTION public.process_reseller_commission_on_order() TO supabase_admin;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.get_my_referral_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_attributed_sales(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attributed_sales(integer) TO authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA temba_internal FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cleanup. Does not invent rewards for old orders (none were attributed).
-- referee_purchase_bonus was an empty string, which does not parse as a number.
-- The three reseller_commissions rows are not on a COMPLETED order.
-- ---------------------------------------------------------------------------

INSERT INTO public.referral_config (key, value, value_type, category, description, is_active)
SELECT
  'attribution_hold_days_without_date',
  '7',
  'number',
  'general',
  'Days to hold a reward when the event has no date',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_config WHERE key = 'attribution_hold_days_without_date'
);

UPDATE public.referral_config
SET value = '0', updated_at = now()
WHERE key = 'referee_purchase_bonus'
  AND btrim(value) = '';

UPDATE public.reseller_commissions
SET status = 'cancelled', updated_at = now()
WHERE id IN (
  'f08afed7-af62-466d-b8d8-4969ee50f5e2',
  '624cf901-2a3e-490a-8205-20f56309ec5e',
  '8fbc24f5-a17e-498d-b75c-f37d68ed604d'
)
AND status = 'pending'
AND NOT EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = reseller_commissions.order_id
    AND o.status = 'COMPLETED'
);

-- program_enabled and reseller_program_enabled stay false.
-- See 20261118_referral_phase1_enable.sql.

COMMIT;
