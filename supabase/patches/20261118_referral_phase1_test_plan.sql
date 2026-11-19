-- Read-only checks. Run AFTER 20261118_referral_phase1.sql.
-- This script does not insert orders, tickets, or payments.
-- It raises if the pure decision function drifts from the cases below.
-- Full payment idempotency still needs a scratch database; see docs/REFERRAL-PHASE1.md.

DO $$
DECLARE
  v_status text;
  v_kind text;
  v_reason text;
BEGIN
  IF temba_internal.normalize_code('  ab ') IS NOT NULL THEN
    RAISE EXCEPTION 'short code must be rejected';
  END IF;
  IF temba_internal.normalize_code('sigui1') IS DISTINCT FROM 'SIGUI1' THEN
    RAISE EXCEPTION 'code must be trimmed and uppercased';
  END IF;
  IF temba_internal.normalize_code('bad code') IS NOT NULL THEN
    RAISE EXCEPTION 'spaces must be rejected';
  END IF;

  SELECT d.status, d.kind, d.reason INTO v_status, v_kind, v_reason
  FROM temba_internal.decide_attribution(false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) d;
  IF v_reason IS DISTINCT FROM 'unknown_code' THEN
    RAISE EXCEPTION 'missing code match must be unknown_code, got %', v_reason;
  END IF;

  SELECT d.status, d.reason INTO v_status, v_reason
  FROM temba_internal.decide_attribution(true, true, true, 'ok', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) d;
  IF v_reason IS DISTINCT FROM 'ambiguous_code' THEN
    RAISE EXCEPTION 'both matches must be ambiguous, got %', v_reason;
  END IF;

  SELECT d.status, d.kind, d.reason INTO v_status, v_kind, v_reason
  FROM temba_internal.decide_attribution(
    true, false, false, NULL,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    NULL, NULL, NULL, NULL, NULL, NULL
  ) d;
  IF v_reason IS DISTINCT FROM 'self_referral' OR v_kind IS NOT NULL THEN
    RAISE EXCEPTION 'buyer matching referrer must be self_referral';
  END IF;

  SELECT d.status, d.kind INTO v_status, v_kind
  FROM temba_internal.decide_attribution(
    true, false, false, NULL,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    NULL, NULL, NULL, NULL, NULL, NULL
  ) d;
  IF v_status IS DISTINCT FROM 'attributed' OR v_kind IS DISTINCT FROM 'user_referral' THEN
    RAISE EXCEPTION 'a different buyer must be attributed as user_referral';
  END IF;

  SELECT d.reason INTO v_reason
  FROM temba_internal.decide_attribution(
    false, true, true, 'ok',
    NULL, NULL,
    '00000000-0000-0000-0000-000000000003',
    '22670123456@temba.temp',
    NULL, NULL, NULL, '+226 70 12 34 56'
  ) d;
  IF v_reason IS DISTINCT FROM 'self_referral' THEN
    RAISE EXCEPTION 'guest placeholder phone must count as self_referral, got %', v_reason;
  END IF;

  SELECT d.status, d.kind INTO v_status, v_kind
  FROM temba_internal.decide_attribution(
    false, true, false, 'not_authorized_for_event',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  ) d;
  IF v_kind IS NOT NULL OR v_status IS DISTINCT FROM 'blocked' THEN
    RAISE EXCEPTION 'invalid reseller code must stay blocked';
  END IF;

  RAISE NOTICE 'referral phase 1 decision checks passed';
END $$;
