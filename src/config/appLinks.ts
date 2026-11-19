import { normalizeAttributionCode } from "../lib/attribution/rules";

/**
 * Buyer app identity and the links that open it.
 * Team id and bundle id come from the v6 iOS project (DEVELOPMENT_TEAM /
 * PRODUCT_BUNDLE_IDENTIFIER). The store id is the App Store app 6748848506.
 * Android package is app.rork.temba. The Play App Signing fingerprint is not
 * in this file: it lives in public/.well-known/assetlinks.json.
 */

const trimSlash = (value: string) => value.replace(/\/$/, "");

function envString(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const BUYER_ANDROID_PACKAGE = "app.rork.temba";
export const BUYER_IOS_BUNDLE_ID = "app.rork.temba";
export const BUYER_APPLE_TEAM_ID = "ZKTVP26742";
export const BUYER_IOS_APP_STORE_ID = "6748848506";
export const BUYER_APP_SCHEME = envString("VITE_REFERRAL_APP_SCHEME") ?? "temba";

export const WEB_ORIGIN = trimSlash(
  envString("VITE_REFERRAL_WEB_ORIGIN") ?? "https://tembas.com",
);

/**
 * AppsFlyer OneLink template Xbe8.
 * VITE_ONELINK_BASE wins, then the older VITE_REFERRAL_ONELINK_BASE.
 * The default subdomain is the one already used on the site. Change it if
 * the AppsFlyer dashboard uses a different OneLink host.
 */
export const ONELINK_BASE = trimSlash(
  envString("VITE_ONELINK_BASE") ??
    envString("VITE_REFERRAL_ONELINK_BASE") ??
    "https://temba.onelink.me/Xbe8",
);

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${BUYER_ANDROID_PACKAGE}`;
export const APP_STORE_URL = `https://apps.apple.com/app/temba/id${BUYER_IOS_APP_STORE_ID}`;

export type MobilePlatform = "ios" | "android" | "desktop";

export function detectMobilePlatform(userAgent: string, maxTouchPoints = 0): MobilePlatform {
  const ua = userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function storeUrlFor(platform: MobilePlatform): string | null {
  if (platform === "ios") return APP_STORE_URL;
  if (platform === "android") return PLAY_STORE_URL;
  return null;
}

/** Path segment used as AppsFlyer deep_link_value. No leading slash, no query. */
export function deepLinkPath(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function ensureReferralSearch(search: string, code: string | null): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (code && !params.get("r")) params.set("r", code);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Code from ?r=, then legacy ?ref=, then the /ref/:code path. */
export function codeFromLocation(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const key of ["r", "ref", "deep_link_sub1"]) {
    const code = normalizeAttributionCode(params.get(key));
    if (code) return code;
  }
  const match = pathname.match(/^\/ref\/([^/]+)/i);
  if (!match) return null;
  try {
    return normalizeAttributionCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export interface DeferredLinkInput {
  /** App path, for example e/slug or ref/CODE. Query is ignored. */
  path: string;
  /** Page the website should show when the app is not installed. */
  webUrl: string;
  code?: string | null;
}

/** af_web_dp always keeps ?r= when a code is known, so the website can store it. */
export function webFallbackUrl(webUrl: string, code: string | null | undefined): string {
  const url = new URL(webUrl, WEB_ORIGIN);
  if (code && !url.searchParams.get("r")) url.searchParams.set("r", code);
  return url.toString();
}

export function buildDeferredOneLink(input: DeferredLinkInput): string {
  const params = new URLSearchParams();
  params.set("deep_link_value", deepLinkPath(input.path));
  if (input.code) params.set("deep_link_sub1", input.code);
  params.set("af_web_dp", webFallbackUrl(input.webUrl, input.code));
  return `${ONELINK_BASE}?${params.toString()}`;
}

/** Opens the installed buyer app. browser_fallback_url is the OneLink. */
export function buildAndroidIntentUrl(httpsUrl: string, fallbackUrl: string): string {
  const url = new URL(httpsUrl);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=${BUYER_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

/**
 * Desktop stays on the website (null).
 * Android uses an intent for https://tembas.com…?r= and falls back to OneLink.
 * iOS uses OneLink: a tap on the same site does not leave Safari for a
 * universal link, and OneLink is the other domain that can open the app
 * and otherwise the store.
 */
export function appHandoffUrl(platform: MobilePlatform, input: DeferredLinkInput): string | null {
  if (platform === "desktop") return null;
  const web = webFallbackUrl(input.webUrl, input.code);
  const oneLink = buildDeferredOneLink({ ...input, webUrl: web });
  if (platform === "android") return buildAndroidIntentUrl(web, oneLink);
  return oneLink;
}
