/**
 * Shared helpers for event link-preview (Open Graph) images and descriptions.
 * Plain TypeScript — imported by the Node OG-image function and by unit tests.
 * Do not import Deno or Node-only APIs here.
 */

export const TEMBA_ORIGIN = "https://tembas.com";
export const TEMBA_OG_FALLBACK = "https://tembas.com/og-image-v2.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
/** WhatsApp drops previews well below the official 8 MB cap; stay under ~550 KB. */
export const OG_IMAGE_MAX_BYTES = 550_000;
export const OG_DESCRIPTION_MAX = 220;

const EVENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEventUuid(value: string): boolean {
  return EVENT_UUID_RE.test(value);
}

/** Short, stable cache-buster so a new flyer gets a new preview URL. */
export function shortHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * First-party image URL for og:image / twitter:image.
 * Always https://tembas.com/og/e/<slug-or-id>, never the raw storage URL.
 * Query `v` is a cache buster only; the image function ignores it for lookup.
 */
/**
 * Origin for og:image links. Production stays on tembas.com.
 * Deploy previews of this Netlify site may use their own host so the
 * preview function can be tested without hitting production.
 * Ignore any other Host header.
 */
export function publicSiteOrigin(rawUrl?: string | null): string {
  if (!rawUrl) return TEMBA_ORIGIN;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host === "tembas.com" || host === "www.tembas.com") {
      return "https://" + host;
    }
    if (
      host === "temba-user.netlify.app" ||
      /^deploy-preview-\d+--temba-user\.netlify\.app$/.test(host)
    ) {
      return "https://" + host;
    }
  } catch {
    // fall through
  }
  return TEMBA_ORIGIN;
}

export function eventOgImageUrl(
  event: { id?: string; slug?: string | null },
  imageUrl?: string | null,
  origin = TEMBA_ORIGIN,
): string {
  const key = String(event.slug ?? "").trim() || String(event.id ?? "").trim();
  if (!key) return TEMBA_OG_FALLBACK;
  const base = publicSiteOrigin(origin) || TEMBA_ORIGIN;
  const url = new URL(`${base}/og/e/${encodeURIComponent(key)}.jpg`);
  if (imageUrl) url.searchParams.set("v", shortHash(imageUrl));
  return url.toString();
}

/** Accept /og/e/slug, /og/e/slug.jpg, or a bare key. */
export function parseOgImageKey(pathOrKey: string): string | null {
  let value = String(pathOrKey ?? "").trim();
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      value = new URL(value).pathname;
    }
  } catch {
    return null;
  }
  value = value.split("?")[0].split("#")[0];
  const ogMatch = value.match(/\/og\/e\/(.+)$/i);
  if (ogMatch) value = ogMatch[1];
  value = value.replace(/^\/+|\/+$/g, "");
  value = value.replace(/\.(jpe?g|png|webp|gif)$/i, "");
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep the raw value if it is not encoded
  }
  value = value.trim();
  if (!value || value.includes("..") || value.includes("/") || value.length > 200) {
    return null;
  }
  return value;
}

export function toAbsoluteHttps(
  raw: string | null | undefined,
  origin = TEMBA_ORIGIN,
): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const url = value.startsWith("//")
      ? new URL(`https:${value}`)
      : value.startsWith("/")
        ? new URL(value, origin)
        : new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Block SSRF: only public https hosts. The function must only fetch image_url
 * values stored on the event, but still reject private/metadata addresses.
 */
export function isBlockedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  if (url.protocol !== "https:") return true;
  if (url.username || url.password) return true;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    host === "metadata.google.internal" ||
    host === "metadata" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true;
  if (host.includes(":")) return true; // raw IPv6, including link-local
  return false;
}

/**
 * Supabase image transformation for public storage objects.
 * Returns a 1200×630 cover URL, or null when the source is not Supabase storage.
 */
export function supabasePublicRenderUrl(
  imageUrl: string,
  width = OG_IMAGE_WIDTH,
  height = OG_IMAGE_HEIGHT,
): string | null {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!/^[^/]+\.supabase\.co$/i.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
  if (!match?.[1]) return null;
  const render = new URL(
    `/storage/v1/render/image/public/${match[1]}`,
    `${url.protocol}//${url.hostname}`,
  );
  render.searchParams.set("width", String(width));
  render.searchParams.set("height", String(height));
  render.searchParams.set("resize", "cover");
  return render.toString();
}

/**
 * Title card description: date and venue first, then the event text.
 * Never adds a price, and never writes "Gratuit".
 */
export function eventShareDescription(opts: {
  title?: string | null;
  description?: string | null;
  dateLabel?: string | null;
  location?: string | null;
}): string {
  const title = String(opts.title ?? "").trim() || "Événement Temba";
  const dateLabel = String(opts.dateLabel ?? "").trim();
  const location = String(opts.location ?? "").trim();
  const facts = [dateLabel, location].filter(Boolean).join(" · ");
  const body = String(opts.description ?? "").trim();
  let text: string;
  if (facts && body) {
    const bodyAlreadyHasFacts =
      (dateLabel && body.toLowerCase().includes(dateLabel.toLowerCase())) ||
      (location && body.toLowerCase().startsWith(location.toLowerCase()));
    text = bodyAlreadyHasFacts ? body : `${facts}. ${body}`;
  } else if (facts) {
    text = `${facts}. Achetez vos billets pour ${title} sur Temba.`;
  } else if (body) {
    text = body;
  } else {
    text = `Achetez vos billets pour ${title}${location ? ` à ${location}` : ""} sur Temba.`;
  }
  if (text.length <= OG_DESCRIPTION_MAX) return text;
  const cut = text.slice(0, OG_DESCRIPTION_MAX - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 80 ? cut.slice(0, sp) : cut).trim()}…`;
}

export function eventShareLocation(
  event: { city?: string | null; location?: string | null },
): string {
  const city = String(event.city ?? "").trim();
  const location = String(event.location ?? "").trim();
  if (city && location) {
    if (location.toLowerCase().includes(city.toLowerCase())) return location;
    return `${location}, ${city}`;
  }
  return location || city;
}
