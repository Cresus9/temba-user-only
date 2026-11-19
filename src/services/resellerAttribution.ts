import { supabase } from '../lib/supabase-client';
import {
  getStoredResellerCode,
  normalizeResellerCode,
} from '../utils/resellerStorage';

const CLICK_DEDUPE_PREFIX = 'temba_reseller_click:';

export type ResellerCodeValidation = {
  valid: boolean;
  normalizedCode: string;
  discountPercent: number;
  reason?: string;
  inconclusive?: boolean;
};

function clickDedupeKey(code: string, eventRef: string): string {
  return `${CLICK_DEDUPE_PREFIX}${code}:${eventRef}`;
}

/**
 * Records a reseller share-link click. p_event must be an event slug or uuid
 * (the RPC rejects an empty event). Deduped per tab session so a refresh
 * does not inflate the daily count.
 */
export async function recordResellerLinkClick(
  rawCode: string,
  eventRef: string,
): Promise<boolean> {
  const code = normalizeResellerCode(rawCode);
  const event = (eventRef || '').trim();
  if (!code || !event || event.length > 120) return false;

  try {
    if (typeof sessionStorage !== 'undefined') {
      const key = clickDedupeKey(code, event);
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, '1');
    }
  } catch {
    /* private mode */
  }

  try {
    const { data, error } = await supabase.rpc('record_reseller_link_click', {
      p_code: code,
      p_event: event,
    });
    if (error) {
      console.warn('[reseller] record_reseller_link_click:', error.message);
      return false;
    }
    return !!(data && typeof data === 'object' && (data as { ok?: boolean }).ok);
  } catch (err) {
    console.warn('[reseller] record_reseller_link_click failed:', err);
    return false;
  }
}

export async function validateResellerCodeForEvent(
  rawCode: string,
  eventId: string,
): Promise<ResellerCodeValidation> {
  const normalizedCode = normalizeResellerCode(rawCode) || '';
  if (!normalizedCode) {
    return { valid: false, normalizedCode: '', discountPercent: 0, reason: 'empty_code' };
  }
  if (!eventId) {
    return { valid: false, normalizedCode, discountPercent: 0, reason: 'event_required' };
  }

  try {
    const { data, error } = await supabase.rpc('validate_reseller_code_for_event', {
      p_code: normalizedCode,
      p_event_id: eventId,
    });
    if (error) {
      console.warn('[reseller] validate_reseller_code_for_event:', error.message);
      return {
        valid: false,
        normalizedCode,
        discountPercent: 0,
        reason: 'rpc_error',
        inconclusive: true,
      };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | {
          valid?: boolean;
          normalized_code?: string;
          discount_percent?: number;
          reason?: string;
        }
      | null
      | undefined;

    if (!row) {
      return { valid: false, normalizedCode, discountPercent: 0, reason: 'code_not_found' };
    }

    const outCode = normalizeResellerCode(row.normalized_code) || normalizedCode;
    if (row.valid) {
      return {
        valid: true,
        normalizedCode: outCode,
        discountPercent: Math.min(100, Math.max(0, Math.round(Number(row.discount_percent) || 0))),
        reason: row.reason || 'ok',
      };
    }
    return {
      valid: false,
      normalizedCode: outCode,
      discountPercent: 0,
      reason: row.reason || 'invalid',
    };
  } catch (err) {
    console.warn('[reseller] validate exception:', err);
    return {
      valid: false,
      normalizedCode,
      discountPercent: 0,
      reason: 'rpc_error',
      inconclusive: true,
    };
  }
}

/**
 * Code to send with order/payment creation. Valid codes are sent.
 * If the RPC cannot be reached, the stored code is still sent so the
 * database trigger can accept or strip it. Invalid codes are dropped.
 */
export async function resellerCodeForCheckout(eventId: string): Promise<string | undefined> {
  const stored = getStoredResellerCode();
  if (!stored || !eventId) return undefined;
  const result = await validateResellerCodeForEvent(stored, eventId);
  if (result.valid) return result.normalizedCode;
  if (result.inconclusive) return stored;
  return undefined;
}
