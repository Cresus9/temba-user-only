/**
 * Smaller copies of event flyers and artist photos, same picture.
 *
 * - Temba storage (Supabase, Paris project): Supabase image transformation
 *   (`/storage/v1/render/image/public/...?width=`), aspect ratio kept.
 * - Flyers hosted on other websites (showbook.africa, fasobouge.com, ...):
 *   Netlify Image CDN (`/.netlify/images?url=&w=`). Only hosts listed in
 *   netlify.toml [images].remote_images can be used, and only on Netlify hosts
 *   (tembas.com, deploy previews). Anything else keeps the original URL.
 *
 * Callers must fall back to the original URL if the resized one fails.
 */

const SUPABASE_PUBLIC = /^https:\/\/wlyncuwbzhzjafmqozcm\.supabase\.co\/storage\/v1\/object\/public\/([^?#]+)/;

/** Keep in sync with netlify.toml [images].remote_images. */
export const REMOTE_IMAGE_HOSTS = [
  'showbook.africa',
  'fasobouge.com',
  'www.fasobouge.com',
  'afroduc.com',
  'foire-skbowa.org',
  'icicine.com',
  'i.natgeofe.com',
  's.rfi.fr',
  'www.infosculturedufaso.net',
  'www.bgospel.com',
  'e-events.s3.eu-north-1.amazonaws.com',
  'sitho.bf',
  'www.ripo.bf',
  'uwmlagvsivxqocklxbbo.supabase.co',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'cdn-images.dzcdn.net',
  'yt3.googleusercontent.com',
  'lastfm.freetls.fastly.net',
];

export const FLYER_WIDTHS = [240, 360, 480, 640, 960];

function onNetlifyHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'tembas.com' ||
    host === 'www.tembas.com' ||
    host === 'temba-user.netlify.app' ||
    /^deploy-preview-\d+--temba-user\.netlify\.app$/.test(host)
  );
}

/** Resized URL at `width` CSS-independent pixels, or null to keep the original. */
export function resizedImageUrl(src: string | null | undefined, width: number, quality = 70): string | null {
  if (!src) return null;
  const supa = src.match(SUPABASE_PUBLIC);
  if (supa) {
    return `https://wlyncuwbzhzjafmqozcm.supabase.co/storage/v1/render/image/public/${supa[1]}?width=${width}&quality=${quality}&resize=contain`;
  }
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !REMOTE_IMAGE_HOSTS.includes(url.hostname.toLowerCase())) return null;
  if (!onNetlifyHost()) return null;
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/** `srcSet` for a flyer, or undefined when the image cannot be resized. */
export function flyerSrcSet(src: string | null | undefined, widths: number[] = FLYER_WIDTHS): string | undefined {
  const first = resizedImageUrl(src, widths[0]);
  if (!first) return undefined;
  return widths.map((w) => `${resizedImageUrl(src, w)} ${w}w`).join(', ');
}
