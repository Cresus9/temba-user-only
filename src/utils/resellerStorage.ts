/**
 * Reseller share-link capture for ?r=CODE.
 * Kept completely separate from user-referral ?ref= (pending_referral_code).
 * Last click wins. Stored for 30 days in localStorage and a first-party cookie.
 */

export const RESELLER_STORAGE_KEY = 'temba_reseller_code';
export const RESELLER_COOKIE_NAME = 'temba_reseller_code';
export const RESELLER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RESELLER_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export type StoredResellerCode = { code: string; savedAt: number };

export function normalizeResellerCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!RESELLER_CODE_PATTERN.test(code)) return null;
  return code;
}

export function eventRefFromPath(pathname: string): string | null {
  const parts = (pathname || '').split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0] === 'e' || parts[0] === 'event' || parts[0] === 'events') {
    const ref = decodeURIComponent(parts[1] || '').trim();
    return ref || null;
  }
  return null;
}

function isFresh(savedAt: number, now: number): boolean {
  return Number.isFinite(savedAt) && now - savedAt <= RESELLER_TTL_MS;
}

function parsePayload(raw: string | null, now: number): StoredResellerCode | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; savedAt?: unknown };
    const code = normalizeResellerCode(typeof parsed.code === 'string' ? parsed.code : null);
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : NaN;
    if (!code || !isFresh(savedAt, now)) return null;
    return { code, savedAt };
  } catch {
    const code = normalizeResellerCode(raw);
    if (!code) return null;
    return { code, savedAt: now };
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function setStoredResellerCode(raw: string, now = Date.now()): string | null {
  const code = normalizeResellerCode(raw);
  if (!code) return null;
  const payload: StoredResellerCode = { code, savedAt: now };
  const serialized = JSON.stringify(payload);
  try {
    localStorage.setItem(RESELLER_STORAGE_KEY, serialized);
  } catch {
    /* private mode / quota */
  }
  try {
    writeCookie(RESELLER_COOKIE_NAME, serialized, Math.floor(RESELLER_TTL_MS / 1000));
  } catch {
    /* ignore */
  }
  return code;
}

export function getStoredResellerCode(now = Date.now()): string | null {
  let fromStorage: StoredResellerCode | null = null;
  try {
    fromStorage = parsePayload(localStorage.getItem(RESELLER_STORAGE_KEY), now);
  } catch {
    fromStorage = null;
  }
  const fromCookie = parsePayload(readCookie(RESELLER_COOKIE_NAME), now);
  const chosen = [fromStorage, fromCookie]
    .filter((row): row is StoredResellerCode => !!row)
    .sort((a, b) => b.savedAt - a.savedAt)[0];

  if (!chosen) {
    clearStoredResellerCode();
    return null;
  }

  // Re-hydrate the other store if one is missing or stale.
  setStoredResellerCode(chosen.code, chosen.savedAt);
  return chosen.code;
}

export function clearStoredResellerCode(): void {
  try {
    localStorage.removeItem(RESELLER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    clearCookie(RESELLER_COOKIE_NAME);
  } catch {
    /* ignore */
  }
}

/** Capture only ?r= — never ?ref=, which is the user-referral param. */
export function captureResellerCodeFromSearch(search: string, now = Date.now()): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const fromR = normalizeResellerCode(params.get('r'));
  if (!fromR) return getStoredResellerCode(now);
  return setStoredResellerCode(fromR, now);
}
