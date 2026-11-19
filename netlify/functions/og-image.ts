/**
 * First-party Open Graph image for event share links.
 *
 * WhatsApp and Facebook fetch og:image themselves. Raw event flyers often live
 * on supabase.co with `x-robots-tag: none`, Cloudflare bot cookies, WebP, or
 * files over ~600 KB — any of which drops the preview photo. This endpoint
 * looks up the event, fetches only that stored image_url, and returns a
 * 1200×630 baseline JPEG from tembas.com.
 *
 * Sharp (native) is preferred. If the native binary is missing from the
 * Netlify bundle, Jimp (pure JS) resizes instead so a preview still works.
 */
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_MAX_BYTES,
  OG_IMAGE_WIDTH,
  TEMBA_OG_FALLBACK,
  isBlockedImageUrl,
  isEventUuid,
  parseOgImageKey,
  supabasePublicRenderUrl,
  toAbsoluteHttps,
} from "../edge-functions/lib/eventOgShare";

type NetlifyEvent = {
  path?: string;
  rawUrl?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  headers?: Record<string, string | undefined>;
};

const FETCH_TIMEOUT_MS = 8000;
const FETCH_MAX_BYTES = 8_000_000;

function supabaseRestConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

function encodeEq(value: string): string {
  return encodeURIComponent(value);
}

async function fetchEventImage(
  key: string,
): Promise<{ imageUrl: string | null }> {
  const cfg = supabaseRestConfig();
  if (!cfg) return { imageUrl: null };
  const filter = isEventUuid(key)
    ? `id=eq.${key}`
    : `slug=eq.${encodeEq(key)}`;
  const qs = `events?${filter}&select=id,slug,image_url,status,deleted_at&limit=1`;
  const res = await fetch(`${cfg.url}/rest/v1/${qs}`, {
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return { imageUrl: null };
  const rows = (await res.json()) as Array<{
    image_url?: string | null;
    status?: string | null;
    deleted_at?: string | null;
  }>;
  const event = rows?.[0];
  if (!event || event.deleted_at) return { imageUrl: null };
  if (event.status && String(event.status).toUpperCase() !== "PUBLISHED") {
    return { imageUrl: null };
  }
  return { imageUrl: event.image_url ?? null };
}

function imageHeaders(
  contentType: string,
  length: number,
  engine?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(length),
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
  };
  if (engine) headers["X-Temba-Og-Engine"] = engine;
  return headers;
}

function jpegResponse(body: Buffer, engine: string, contentType = "image/jpeg") {
  return {
    statusCode: 200,
    headers: imageHeaders(contentType, body.length, engine),
    body: body.toString("base64"),
    isBase64Encoded: true,
  };
}

async function fetchBytes(url: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (isBlockedImageUrl(url)) return null;
  const res = await fetch(url, {
    headers: {
      Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.1",
      "User-Agent": "TembaOgImage/1.0 (+https://tembas.com)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const finalUrl = res.url || url;
  if (isBlockedImageUrl(finalUrl)) return null;
  const lengthHeader = Number(res.headers.get("content-length") || 0);
  if (lengthHeader > FETCH_MAX_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > FETCH_MAX_BYTES) return null;
  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
  return { bytes: buf, contentType };
}

async function resizeWithSharp(bytes: Buffer): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    let quality = 80;
    let out = await sharp(bytes)
      .rotate()
      .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { fit: "cover", position: "centre" })
      .jpeg({ quality, progressive: false, chromaSubsampling: "4:2:0" })
      .toBuffer();
    while (out.length > OG_IMAGE_MAX_BYTES && quality > 45) {
      quality -= 10;
      out = await sharp(bytes)
        .rotate()
        .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { fit: "cover", position: "centre" })
        .jpeg({ quality, progressive: false, chromaSubsampling: "4:2:0" })
        .toBuffer();
    }
    return out.length <= OG_IMAGE_MAX_BYTES ? out : null;
  } catch (err) {
    console.warn("og-image: sharp unavailable", err instanceof Error ? err.message : "error");
    return null;
  }
}

async function resizeWithJimp(bytes: Buffer): Promise<Buffer | null> {
  try {
    const jimpMod = await import("jimp");
    const Jimp = (jimpMod as { default?: any }).default ?? jimpMod;
    const image = await Jimp.read(bytes);
    image.cover(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);
    let quality = 80;
    image.quality(quality);
    let out: Buffer = Buffer.from(await image.getBufferAsync(Jimp.MIME_JPEG));
    while (out.length > OG_IMAGE_MAX_BYTES && quality > 45) {
      quality -= 10;
      image.quality(quality);
      out = Buffer.from(await image.getBufferAsync(Jimp.MIME_JPEG));
    }
    return out.length <= OG_IMAGE_MAX_BYTES ? out : null;
  } catch (err) {
    console.warn("og-image: jimp unavailable", err instanceof Error ? err.message : "error");
    return null;
  }
}

async function toShareJpeg(bytes: Buffer): Promise<{ body: Buffer; engine: string } | null> {
  const sharpOut = await resizeWithSharp(bytes);
  if (sharpOut) return { body: sharpOut, engine: "sharp" };
  const jimpOut = await resizeWithJimp(bytes);
  if (jimpOut) return { body: jimpOut, engine: "jimp" };
  return null;
}

function looksLikeImage(bytes: Buffer, contentType: string): boolean {
  if (bytes.length < 16) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true; // jpeg
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return true; // png
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return true;
  }
  return /image\/(jpeg|jpg|png|webp)/i.test(contentType);
}

async function fallbackJpeg(): Promise<
  | { statusCode: number; headers: Record<string, string>; body: string; isBase64Encoded: boolean }
  | { statusCode: number; headers: Record<string, string> }
> {
  const fallback = await fetchBytes(TEMBA_OG_FALLBACK);
  if (fallback) {
    const converted = await toShareJpeg(fallback.bytes);
    if (converted) return jpegResponse(converted.body, converted.engine);
  }
  return {
    statusCode: 302,
    headers: { Location: TEMBA_OG_FALLBACK, "Cache-Control": "public, max-age=300" },
  };
}

function requestKey(event: NetlifyEvent): string | null {
  const fromQuery = event.queryStringParameters?.key;
  if (fromQuery) return parseOgImageKey(fromQuery);
  const candidates = [event.rawUrl, event.path, event.headers?.["x-original-url"]];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = parseOgImageKey(candidate);
    if (parsed) return parsed;
  }
  return null;
}

export async function handler(event: NetlifyEvent) {
  try {
    const key = requestKey(event);
    if (!key) {
      return fallbackJpeg();
    }

    const { imageUrl } = await fetchEventImage(key);
    const absolute = toAbsoluteHttps(imageUrl);
    if (!absolute || isBlockedImageUrl(absolute)) {
      return fallbackJpeg();
    }

    const candidates: string[] = [];
    const rendered = supabasePublicRenderUrl(absolute);
    if (rendered) candidates.push(rendered);
    candidates.push(absolute);

    for (const source of candidates) {
      const fetched = await fetchBytes(source);
      if (!fetched || !looksLikeImage(fetched.bytes, fetched.contentType)) continue;
      const converted = await toShareJpeg(fetched.bytes);
      if (converted) return jpegResponse(converted.body, converted.engine);
    }

    return fallbackJpeg();
  } catch {
    return fallbackJpeg();
  }
}
