import { ATTRIBUTION_WINDOW_MS, normalizeAttributionCode } from "../lib/attribution/rules";

/** Legacy key kept so an older tab still finds the code. New reads prefer the stamped record. */
export const PENDING_REFERRAL_CODE_KEY = "pending_referral_code";
export const ATTRIBUTION_STORAGE_KEY = "temba_attr_v1";
export const ATTRIBUTION_COOKIE = "temba_r";

interface StampedCode {
  code: string;
  setAt: number;
}

function readStamp(raw: string | null): StampedCode | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; setAt?: unknown };
    const code = normalizeAttributionCode(typeof parsed.code === "string" ? parsed.code : null);
    const setAt = typeof parsed.setAt === "number" ? parsed.setAt : NaN;
    if (!code || !Number.isFinite(setAt)) return null;
    return { code, setAt };
  } catch {
    return null;
  }
}

function readCookie(now: number): StampedCode | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((part) => part.trim());
  const row = parts.find((part) => part.startsWith(`${ATTRIBUTION_COOKIE}=`));
  if (!row) return null;
  const value = decodeURIComponent(row.slice(ATTRIBUTION_COOKIE.length + 1));
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const code = normalizeAttributionCode(value.slice(0, dot));
  const setAt = Number(value.slice(dot + 1));
  if (!code || !Number.isFinite(setAt)) return null;
  if (now - setAt > ATTRIBUTION_WINDOW_MS) return null;
  return { code, setAt };
}

function writeCookie(stamp: StampedCode): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.floor(ATTRIBUTION_WINDOW_MS / 1000);
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(`${stamp.code}.${stamp.setAt}`)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function clearCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function persist(stamp: StampedCode): void {
  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stamp));
    localStorage.setItem(PENDING_REFERRAL_CODE_KEY, stamp.code);
  } catch {
    /* private mode / quota */
  }
  writeCookie(stamp);
}

/**
 * Last click wins, for 30 days. `?r=` is the link format. `?ref=` is the legacy alias.
 * `deep_link_sub1` is what an AppsFlyer return carries when the web page
 * did not keep `?r=`. The first valid code wins, so `?r=` is kept.
 */
export function attributionCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const key of ["r", "ref", "deep_link_sub1"]) {
    const code = normalizeAttributionCode(params.get(key));
    if (code) return code;
  }
  return null;
}

export function captureAttributionSearch(search: string, now = Date.now()): void {
  const code = attributionCodeFromSearch(search);
  if (!code) return;
  persist({ code, setAt: now });
}

/** Last click wins. Replaces any code already stored. */
export function setPendingReferralCode(code: string, now = Date.now()): void {
  const normalized = normalizeAttributionCode(code);
  if (!normalized) return;
  persist({ code: normalized, setAt: now });
}

export function getPendingReferralCode(now = Date.now()): string | null {
  let stamp = readStamp(safeGet(ATTRIBUTION_STORAGE_KEY));
  const cookie = readCookie(now);
  if (cookie && (!stamp || cookie.setAt > stamp.setAt)) stamp = cookie;

  if (!stamp) {
    const legacy = normalizeAttributionCode(safeGet(PENDING_REFERRAL_CODE_KEY));
    if (legacy) {
      stamp = { code: legacy, setAt: now };
      persist(stamp);
    }
  }

  if (!stamp) return null;
  if (now - stamp.setAt > ATTRIBUTION_WINDOW_MS) {
    clearPendingReferralCode();
    return null;
  }
  return stamp.code;
}

export function clearPendingReferralCode(): void {
  try {
    localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    localStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
  } catch {
    /* ignore */
  }
  clearCookie();
}

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  return normalizeAttributionCode(raw);
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
