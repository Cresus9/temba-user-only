import { ATTRIBUTION_WINDOW_MS, normalizeAttributionCode } from "../lib/attribution/rules";

/** Legacy key kept so an older tab still finds the code. New reads prefer the stamped record. */
export const PENDING_REFERRAL_CODE_KEY = "pending_referral_code";
export const ATTRIBUTION_STORAGE_KEY = "temba_attr_v1";
export const ATTRIBUTION_COOKIE = "temba_r";

export interface AttributionEventRef {
  id?: string | null;
  slug?: string | null;
}

interface StampedCode {
  code: string;
  setAt: number;
  eventKey?: string | null;
}

function readStamp(raw: string | null): StampedCode | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; setAt?: unknown; eventKey?: unknown };
    const code = normalizeAttributionCode(typeof parsed.code === "string" ? parsed.code : null);
    const setAt = typeof parsed.setAt === "number" ? parsed.setAt : NaN;
    if (!code || !Number.isFinite(setAt)) return null;
    const eventKey =
      typeof parsed.eventKey === "string" && parsed.eventKey.trim()
        ? parsed.eventKey.trim().toLowerCase()
        : null;
    return { code, setAt, eventKey };
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
  const code = normalizeAttributionCode(dot > 0 ? value.slice(0, dot) : null);
  const setAt = Number(dot > 0 ? value.slice(dot + 1) : NaN);
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
  const stored: StampedCode = { code: stamp.code, setAt: stamp.setAt };
  if (stamp.eventKey) stored.eventKey = stamp.eventKey;
  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
    localStorage.setItem(PENDING_REFERRAL_CODE_KEY, stamp.code);
  } catch {
    /* private mode / quota */
  }
  writeCookie(stamp);
}

/** Event slug or id from /e/:slug and the legacy /event/:slug path. */
export function attributionEventKeyFromPath(pathname: string): string | null {
  const path = (pathname.split("?")[0].split("#")[0] || "/").replace(/\/+$/, "") || "/";
  const match = path.match(/^\/(?:e|event)\/([^/]+)$/i);
  if (!match) return null;
  try {
    const key = decodeURIComponent(match[1]).trim().toLowerCase();
    return key || null;
  } catch {
    return null;
  }
}

/** OneLink `deep_link_value=e/slug` carries the same event as `/e/slug`. */
export function attributionEventKeyFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const value = params.get("deep_link_value");
  if (!value) return null;
  const path = value.startsWith("/") ? value : `/${value}`;
  return attributionEventKeyFromPath(path);
}

function eventKeyForCapture(search: string, pathname?: string): string | null {
  return attributionEventKeyFromPath(pathname || "") || attributionEventKeyFromSearch(search);
}

/**
 * Last click wins, until the code is consumed after a paid order, or 15 days pass.
 * `?r=` is the link format. `?ref=` is the legacy alias.
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

export function captureAttributionSearch(search: string, now = Date.now(), pathname = ""): void {
  const code = attributionCodeFromSearch(search);
  if (!code) return;
  persist({ code, setAt: now, eventKey: eventKeyForCapture(search, pathname) });
}

/** Last click wins. Replaces any code already stored. Pass eventKey when the link was event-specific. */
export function setPendingReferralCode(code: string, now = Date.now(), eventKey?: string | null): void {
  const normalized = normalizeAttributionCode(code);
  if (!normalized) return;
  const key = eventKey?.trim().toLowerCase() || null;
  persist({ code: normalized, setAt: now, eventKey: key });
}

function readFreshStamp(now: number): StampedCode | null {
  let stamp = readStamp(safeGet(ATTRIBUTION_STORAGE_KEY));
  const cookie = readCookie(now);
  if (cookie && (!stamp || cookie.setAt > stamp.setAt)) {
    stamp = { ...cookie, eventKey: stamp?.eventKey ?? cookie.eventKey };
  }

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
  return stamp;
}

export function getPendingReferralCode(now = Date.now()): string | null {
  return readFreshStamp(now)?.code ?? null;
}

/** A generic link (no event) applies to any checkout. An event link applies only to that event. */
export function attributionMatchesEvent(
  eventKey: string | null | undefined,
  event: AttributionEventRef | null | undefined,
): boolean {
  if (!eventKey) return true;
  const key = eventKey.toLowerCase();
  if (event?.id && event.id.toLowerCase() === key) return true;
  if (event?.slug && event.slug.trim().toLowerCase() === key) return true;
  return false;
}

export function getAttributionForCheckout(event: AttributionEventRef, now = Date.now()): string | null {
  const stamp = readFreshStamp(now);
  if (!stamp || !attributionMatchesEvent(stamp.eventKey, event)) return null;
  return stamp.code;
}

/** Fields sent at payment time. Extra keys are ignored by an undeployed function. */
export function attributionCheckoutPayload(
  event: AttributionEventRef,
  now = Date.now(),
): {
  attribution_code?: string;
  attribution_event_id?: string;
  attribution_captured_at?: string;
} {
  const stamp = readFreshStamp(now);
  if (!stamp || !attributionMatchesEvent(stamp.eventKey, event)) return {};
  const payload: {
    attribution_code?: string;
    attribution_event_id?: string;
    attribution_captured_at?: string;
  } = {
    attribution_code: stamp.code,
    attribution_captured_at: new Date(stamp.setAt).toISOString(),
  };
  if (stamp.eventKey && event.id) payload.attribution_event_id = event.id;
  return payload;
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

/** Call once a referred order has been paid, so the same click is not reused. */
export const consumeAttributionOnPaidOrder = clearPendingReferralCode;

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
