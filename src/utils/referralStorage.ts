import { PENDING_REFERRAL_CODE_KEY } from '../constants/referral';

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

/**
 * First-click wins: do not overwrite an existing pending code.
 * Aligns with mobile ReferralDeepLinkHandler product rule.
 */
export function setPendingReferralCode(code: string): void {
  try {
    const normalized = normalizeReferralCode(code);
    if (!normalized) return;
    const existing = localStorage.getItem(PENDING_REFERRAL_CODE_KEY);
    if (existing) return;
    localStorage.setItem(PENDING_REFERRAL_CODE_KEY, normalized);
  } catch {
    /* private mode / quota */
  }
}

export function getPendingReferralCode(): string | null {
  try {
    return normalizeReferralCode(localStorage.getItem(PENDING_REFERRAL_CODE_KEY));
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    localStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
  } catch {
    /* ignore */
  }
}
