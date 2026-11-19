import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_WINDOW_MS,
  attributionAttachDecision,
  commissionRate,
  decideAttribution,
  holdAvailableAt,
  isFullChargeRefund,
  normalizeAttributionCode,
  planReversal,
  planRewards,
  referralIdempotencyKey,
} from './rules';
import { buildReferralShareLinks } from '../../config/referralShare';
import {
  captureAttributionSearch,
  clearPendingReferralCode,
  getPendingReferralCode,
  setPendingReferralCode,
} from '../../utils/referralStorage';

const buyer = '00000000-0000-0000-0000-000000000002';
const referrer = '00000000-0000-0000-0000-000000000001';
const orderA = '00000000-0000-0000-0000-0000000000a1';
const orderB = '00000000-0000-0000-0000-0000000000b2';

describe('attribution code', () => {
  it('accepts a reseller or referral code and rejects junk', () => {
    expect(normalizeAttributionCode(' sigui1 ')).toBe('SIGUI1');
    expect(normalizeAttributionCode('ab')).toBeNull();
    expect(normalizeAttributionCode('bad code')).toBeNull();
    expect(normalizeAttributionCode(null)).toBeNull();
  });

  it('builds the single web link format', () => {
    expect(buildReferralShareLinks('TEMBA8YEF').web).toBe('https://tembas.com/?r=TEMBA8YEF');
  });
});

describe('decideAttribution', () => {
  it('blocks a buyer who uses their own code', () => {
    expect(decideAttribution({
      hasUser: true,
      hasReseller: false,
      resellerValid: false,
      buyerId: referrer,
      referrerId: referrer,
    })).toEqual({ status: 'blocked', kind: null, reason: 'self_referral' });
  });

  it('blocks a guest checkout that reuses the referrer phone', () => {
    expect(decideAttribution({
      hasUser: true,
      hasReseller: false,
      resellerValid: false,
      buyerId: null,
      referrerId: referrer,
      guestEmail: '22670123456@temba.temp',
      referrerPhone: '+226 70 12 34 56',
    }).reason).toBe('self_referral');
  });

  it('blocks a code that is both a user and a reseller', () => {
    expect(decideAttribution({
      hasUser: true,
      hasReseller: true,
      resellerValid: true,
    }).reason).toBe('ambiguous_code');
  });

  it('attributes a different buyer and a valid reseller', () => {
    expect(decideAttribution({
      hasUser: true,
      hasReseller: false,
      resellerValid: false,
      buyerId: buyer,
      referrerId: referrer,
    })).toMatchObject({ status: 'attributed', kind: 'user_referral' });

    expect(decideAttribution({
      hasUser: false,
      hasReseller: true,
      resellerValid: true,
      buyerId: buyer,
      resellerUserId: referrer,
    })).toMatchObject({ status: 'attributed', kind: 'reseller' });
  });
});

describe('planRewards', () => {
  const base = {
    orderId: orderA,
    paid: true,
    status: 'attributed' as const,
    kind: 'user_referral' as const,
    programEnabled: true,
    resellerProgramEnabled: true,
    basis: 5000,
    minPurchase: 500,
    referrerReward: 500,
    refereeBonus: null,
    commissionRate: 8,
    referrerId: referrer,
    buyerId: buyer,
    guestEmail: null,
    resellerId: null,
  };

  it('writes nothing when there is no code', () => {
    expect(planRewards({ ...base, status: null, kind: null })).toEqual([]);
    expect(planRewards({ ...base, paid: false })).toEqual([]);
    expect(planRewards({ ...base, status: 'blocked' })).toEqual([]);
  });

  it('uses one key per buyer so a second order cannot double-credit', () => {
    const first = planRewards(base);
    const second = planRewards({ ...base, orderId: orderB });
    expect(first).toHaveLength(1);
    expect(first[0].idempotencyKey).toBe(second[0].idempotencyKey);
    expect(first[0].idempotencyKey).toBe(referralIdempotencyKey({
      referrerId: referrer,
      buyerId: buyer,
      guestEmail: null,
      orderId: orderA,
    }));
    expect(first[0].idempotencyKey.includes(orderA)).toBe(false);
  });

  it('keeps a reseller commission per order and skips a zero rate', () => {
    const sale = planRewards({
      ...base,
      kind: 'reseller',
      referrerId: null,
      resellerId: referrer,
      commissionRate: 8,
    });
    expect(sale[0].idempotencyKey).toBe(`reseller_commission:${orderA}`);
    expect(sale[0].amount).toBe(400);
    expect(planRewards({ ...base, kind: 'reseller', resellerId: referrer, commissionRate: 0 })).toEqual([]);
  });

  it('does not pay a referral while the program flag is off or the total is under the minimum', () => {
    expect(planRewards({ ...base, programEnabled: false })).toEqual([]);
    expect(planRewards({ ...base, basis: 100 })).toEqual([]);
    expect(planRewards({ ...base, referrerReward: null })).toEqual([]);
  });
});

describe('commissionRate', () => {
  it('prefers the code, then the event, then the reseller, then 8', () => {
    expect(commissionRate({ codeOverride: 5, eventRate: 10, resellerRate: 12, defaultRate: 8 })).toBe(5);
    expect(commissionRate({ codeOverride: 0, eventRate: 0, resellerRate: 12 })).toBe(0);
    expect(commissionRate({ codeOverride: null, eventRate: null, resellerRate: null, defaultRate: null })).toBe(8);
  });
});

describe('hold and reversal', () => {
  it('holds until the day after the event in Ouagadougou', () => {
    const at = holdAvailableAt('2026-12-01', 'Africa/Ouagadougou', new Date('2026-11-01T00:00:00Z'));
    expect(at.toISOString()).toBe('2026-12-02T00:00:00.000Z');
  });

  it('holds a dateless event for the fallback window', () => {
    const paid = new Date('2026-11-01T00:00:00Z');
    const at = holdAvailableAt(null, 'Africa/Ouagadougou', paid, 7);
    expect(at.getTime() - paid.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('reverses rewards only when the card charge is fully refunded', () => {
    expect(isFullChargeRefund({ refunded: false, amount: 1000, amountRefunded: 100 })).toBe(false);
    expect(isFullChargeRefund({ refunded: true, amount: 1000, amountRefunded: 1000 })).toBe(true);
    expect(isFullChargeRefund({ refunded: false, amount: 1000, amountRefunded: 1000 })).toBe(true);
  });

  it('reverses a pending row once', () => {
    const key = `reseller_commission:${orderA}`;
    expect(planReversal([{ key, status: 'pending' }])).toEqual([`reversal:${key}`]);
    expect(planReversal([{ key, status: 'reversed' }])).toEqual([]);
    expect(planReversal([{ key: `reversal:${key}`, status: 'reversed' }])).toEqual([]);
  });
});

describe('attributionAttachDecision', () => {
  it('allows the order this request just created and refuses to overwrite a code', () => {
    expect(attributionAttachDecision({
      createdInThisRequest: true,
      existingCode: null,
      orderUserId: null,
      jwtUserId: null,
      guestTokenMatches: false,
    })).toBe('allow');
    expect(attributionAttachDecision({
      createdInThisRequest: true,
      existingCode: 'SIGUI1',
      orderUserId: buyer,
      jwtUserId: buyer,
      guestTokenMatches: false,
    })).toBe('skip');
  });

  it('refuses a caller who does not own the unpaid order', () => {
    expect(attributionAttachDecision({
      createdInThisRequest: false,
      existingCode: null,
      orderUserId: buyer,
      jwtUserId: referrer,
      guestTokenMatches: false,
    })).toBe('skip');
    expect(attributionAttachDecision({
      createdInThisRequest: false,
      existingCode: null,
      orderUserId: buyer,
      jwtUserId: null,
      guestTokenMatches: true,
    })).toBe('skip');
    expect(attributionAttachDecision({
      createdInThisRequest: false,
      existingCode: null,
      orderUserId: null,
      jwtUserId: null,
      guestTokenMatches: false,
    })).toBe('skip');
  });

  it('allows the buyer session or the matching guest token', () => {
    expect(attributionAttachDecision({
      createdInThisRequest: false,
      existingCode: null,
      orderUserId: buyer,
      jwtUserId: buyer,
      guestTokenMatches: false,
    })).toBe('allow');
    expect(attributionAttachDecision({
      createdInThisRequest: false,
      existingCode: null,
      orderUserId: null,
      jwtUserId: null,
      guestTokenMatches: true,
    })).toBe('allow');
  });
});

describe('capture', () => {
  it('keeps the latest code for 30 days and prefers ?r= over ?ref=', () => {
    clearPendingReferralCode();
    const start = Date.UTC(2026, 10, 1);
    captureAttributionSearch('?ref=SIGUI1', start);
    expect(getPendingReferralCode(start)).toBe('SIGUI1');
    captureAttributionSearch('?r=TEMBA8YEF&ref=OTHER1', start + 1000);
    expect(getPendingReferralCode(start + 1000)).toBe('TEMBA8YEF');
    expect(document.cookie).toContain('temba_r=');
    expect(getPendingReferralCode(start + ATTRIBUTION_WINDOW_MS + 2000)).toBeNull();
  });

  it('does not clear a stored code when the page has no code', () => {
    clearPendingReferralCode();
    setPendingReferralCode('SIGUI1', Date.UTC(2026, 10, 2));
    captureAttributionSearch('', Date.UTC(2026, 10, 3));
    expect(getPendingReferralCode(Date.UTC(2026, 10, 3))).toBe('SIGUI1');
  });

  it('keeps ?r= on a OneLink return and reads deep_link_sub1 only when ?r= is absent', () => {
    clearPendingReferralCode();
    const start = Date.UTC(2026, 10, 4);
    captureAttributionSearch('?deep_link_value=ref/OTHER01&deep_link_sub1=OTHER01&r=SIGUI1', start);
    expect(getPendingReferralCode(start)).toBe('SIGUI1');
    clearPendingReferralCode();
    captureAttributionSearch('?deep_link_value=e/soiree&deep_link_sub1=TEMBA8YEF', start);
    expect(getPendingReferralCode(start)).toBe('TEMBA8YEF');
  });
});
