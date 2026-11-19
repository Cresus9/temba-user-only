import { afterEach, describe, expect, it } from 'vitest';
import {
  RESELLER_COOKIE_NAME,
  RESELLER_STORAGE_KEY,
  RESELLER_TTL_MS,
  captureResellerCodeFromSearch,
  clearStoredResellerCode,
  eventRefFromPath,
  getStoredResellerCode,
  normalizeResellerCode,
  setStoredResellerCode,
} from './resellerStorage';

afterEach(() => {
  clearStoredResellerCode();
  localStorage.clear();
  document.cookie.split(';').forEach((part) => {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
});

describe('normalizeResellerCode', () => {
  it('uppercases a valid TB code', () => {
    expect(normalizeResellerCode('tb4f9a21')).toBe('TB4F9A21');
  });

  it('rejects empty, short, or junk values', () => {
    expect(normalizeResellerCode('')).toBeNull();
    expect(normalizeResellerCode('ab')).toBeNull();
    expect(normalizeResellerCode('not a code')).toBeNull();
    expect(normalizeResellerCode('ref=xyz')).toBeNull();
  });
});

describe('eventRefFromPath', () => {
  it('reads /e, /event and /events slugs', () => {
    expect(eventRefFromPath('/e/concert-ouaga')).toBe('concert-ouaga');
    expect(eventRefFromPath('/event/concert-ouaga')).toBe('concert-ouaga');
    expect(eventRefFromPath('/events/abc-uuid')).toBe('abc-uuid');
  });

  it('ignores other routes', () => {
    expect(eventRefFromPath('/')).toBeNull();
    expect(eventRefFromPath('/ref/CODE')).toBeNull();
    expect(eventRefFromPath('/checkout')).toBeNull();
  });
});

describe('storage', () => {
  it('last click wins and is readable from localStorage and cookie', () => {
    setStoredResellerCode('FIRST1', 1_000);
    setStoredResellerCode('second2', 2_000);
    expect(getStoredResellerCode(2_000)).toBe('SECOND2');
    const raw = localStorage.getItem(RESELLER_STORAGE_KEY);
    expect(raw).toContain('SECOND2');
    expect(document.cookie).toContain(RESELLER_COOKIE_NAME);
  });

  it('expires after 30 days', () => {
    const savedAt = 1_000;
    setStoredResellerCode('TB4F9A21', savedAt);
    expect(getStoredResellerCode(savedAt + RESELLER_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem(RESELLER_STORAGE_KEY)).toBeNull();
  });
});

describe('captureResellerCodeFromSearch', () => {
  it('captures ?r= and ignores ?ref=', () => {
    expect(captureResellerCodeFromSearch('?r=temba8yef&ref=USERCODE')).toBe('TEMBA8YEF');
    expect(getStoredResellerCode()).toBe('TEMBA8YEF');
  });

  it('does not overwrite from a bare ?ref= user referral', () => {
    setStoredResellerCode('TB4F9A21');
    expect(captureResellerCodeFromSearch('?ref=USERCODE')).toBe('TB4F9A21');
  });

  it('keeps the stored code when the URL has no r=', () => {
    setStoredResellerCode('TB4F9A21');
    expect(captureResellerCodeFromSearch('')).toBe('TB4F9A21');
  });
});
