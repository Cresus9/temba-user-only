import type { Context } from "https://edge.netlify.com";
import {
  TEMBA_ORIGIN,
  eventOgImageUrl,
  eventShareDescription,
  eventShareLocation,
  publicSiteOrigin,
  toAbsoluteHttps,
} from "./lib/eventOgShare.ts";
import { buildEventJsonLd, formatFcfa, realPrice, stripTags } from "./lib/eventJsonLd.ts";
import { artistPageTitle, eventSeoTitle, frDayRange, splitArtistShows } from "./lib/eventSeo.ts";
import { buildVenueIndex, type VenueRowLite } from "./lib/venueIndex.ts";
import { LANDING_PAGES, landingByPath, isConcertCategory, selectLandingEvents, weekendRange } from "./lib/landingPages.ts";

/**
 * Crawler-facing HTML for Googlebot, social bots, and other non-JS clients.
 *
 * Humans still get the React SPA (context.next()).
 * Crawlers get a faithful HTML snapshot: title, description, date, venue,
 * price, Event JSON-LD, and links to other published events.
 *
 * Do NOT add a meta-refresh — Google treats that as a redirect and drops the page.
 */

/** Official share image. Never the old purple-T placeholder. */
const TEMBA_OG_IMAGE = "https://tembas.com/og-image-v2.png";
/** Square logo for Google (Organization.logo): the real white T on Temba blue, 512×512. */
const TEMBA_LOGO_SQUARE = "https://tembas.com/icon-512-v2.png";

function getSupabaseRestConfig(): { url: string; anonKey: string } | null {
  const url =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("VITE_SUPABASE_ANON_KEY") ??
    "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

const CRAWLER_USER_AGENTS = [
  "googlebot",
  "google-inspectiontool",
  "storebot-google",
  "google-extended",
  "google-cloudvertexbot",
  "googleother",
  "bingbot",
  "yandexbot",
  "duckduckbot",
  "baiduspider",
  "facebookexternalhit",
  "facebot",
  "whatsapp",
  "twitterbot",
  "linkedinbot",
  "pinterest",
  "slackbot",
  "telegrambot",
  "discordbot",
  "applebot",
  "ahrefsbot",
  "ahrefssiteaudit",
  "semrushbot",
  "dotbot",
  "rogerbot",
  "screaming frog",
  "petalbot",
  "bytespider",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-user",
  "claude-searchbot",
  "anthropic",
  "perplexitybot",
  "perplexity-user",
  "gemini",
  "bard",
  "amazonbot",
  "ccbot",
  "meta-externalagent",
  "youbot",
  "mistralai",
  "cohere-ai",
  "xai-grok",
  "grok",
  "deepseek",
  "ia_archiver",
  "duckassist",
];

const CITY_PAGES: Record<
  string,
  { name: string; title: string; description: string; aliases: string[]; countryCode: string }
> = {
  ouagadougou: {
    name: "Ouagadougou",
    countryCode: "BF",
    title: "Événements à Ouagadougou — billets en FCFA",
    description:
      "Concerts, festivals, soirées et attractions à Ouagadougou. Achetez vos billets Temba en Orange Money, Moov ou carte.",
    aliases: ["ouagadougou", "ouaga"],
  },
  "bobo-dioulasso": {
    name: "Bobo-Dioulasso",
    countryCode: "BF",
    title: "Événements à Bobo-Dioulasso — billets Temba",
    description:
      "Agenda Temba à Bobo-Dioulasso : concerts, culture et sorties. Billets en ligne, paiement Mobile Money.",
    aliases: ["bobo-dioulasso", "bobo dioulasso", "bobo"],
  },
  abidjan: {
    name: "Abidjan",
    countryCode: "CI",
    title: "Événements à Abidjan — billets Temba",
    description:
      "Concerts et festivals à Abidjan sur Temba. Réservez en ligne, payez en FCFA, présentez votre QR à l’entrée.",
    aliases: ["abidjan", "cocody", "plateau", "yopougon", "marcory"],
  },
  dakar: {
    name: "Dakar",
    countryCode: "SN",
    title: "Événements à Dakar — billets Temba",
    description: "Concerts et festivals à Dakar. Achetez vos billets Temba en ligne, QR sur mobile.",
    aliases: ["dakar"],
  },
};

const DEFAULT_CITY_BY_COUNTRY: Record<string, string> = {
  BF: "ouagadougou",
  CI: "abidjan",
  SN: "dakar",
};

function foldAscii(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function frenchCategorySlug(category: { slug?: string; name?: string } | null, fallback: string): string {
  const s = String(category?.slug ?? "").toLowerCase();
  const n = foldAscii(String(category?.name ?? "").replace(/-/g, " "));
  const f = foldAscii(fallback.replace(/-/g, " "));
  if (
    s === "music-concerts" ||
    n.includes("music concert") ||
    n.includes("concerts de musique") ||
    f.includes("music concert") ||
    fallback === "concerts-de-musique"
  ) {
    return "concerts-de-musique";
  }
  if (s === "sports" || n === "sports" || n === "sport" || fallback === "sports") {
    return "sport";
  }
  if (s === "cinema" || n.includes("cinema") || fallback === "cinema") return "cinema";
  if (s === "festivals" || n.includes("festival") || fallback === "festivals") return "festivals";
  return s || fallback;
}

function frenchCategoryName(slug: string, dbName?: string): string {
  if (slug === "concerts-de-musique") return "Concerts de Musique";
  if (slug === "cinema") return "Cinéma";
  if (slug === "sport") return "Sports";
  if (slug === "festivals") return "Festivals";
  return dbName || slug;
}
function aliasesHitHay(hay: string, aliases: string[]): boolean {
  if (!hay) return false;
  const tokens = hay.split(/[^a-z0-9]+/).filter(Boolean);
  return aliases.some((alias) => {
    const a = foldAscii(alias);
    if (!a) return false;
    if (a.includes(" ")) return hay.includes(a);
    return tokens.includes(a);
  });
}

function eventMatchesCityPage(
  event: { city?: string; location?: string; address?: string; country_code?: string },
  slug: string,
  cityPage: { aliases: string[]; countryCode: string }
): boolean {
  const hay = foldAscii([event.city, event.location, event.address].filter(Boolean).join(" "));
  if (aliasesHitHay(hay, cityPage.aliases)) return true;
  const other = Object.entries(CITY_PAGES).some(
    ([otherSlug, page]) => otherSlug !== slug && aliasesHitHay(hay, page.aliases)
  );
  if (other) return false;
  const cc = String(event.country_code || "BF").toUpperCase();
  if (cc !== cityPage.countryCode) return false;
  return DEFAULT_CITY_BY_COUNTRY[cc] === slug;
}

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  if (CRAWLER_USER_AGENTS.some((c) => ua.includes(c))) return true;
  const looksLikeBrowser = /chrome\/|crios\/|firefox\/|fxios\/|edg\/|opr\/|samsungbrowser/.test(ua);
  if (looksLikeBrowser) return false;
  return /\b(bot|crawler|spider|slurp|fetcher)\b/.test(ua);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function supabaseGet(path: string): Promise<any[] | null> {
  const cfg = getSupabaseRestConfig();
  if (!cfg) return null;
  try {
    const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.error("og-tags supabase error:", error);
    return null;
  }
}

/**
 * event_artists read limited to confirmed links. The public read policy already
 * returns confirmed links only once migration 20261127130000 is applied; before
 * it, the status column does not exist and the plain query is used.
 */
async function supabaseGetLineup(path: string) {
  const withStatus = await supabaseGet(`${path}&status=eq.confirmed`);
  if (withStatus !== null) return withStatus;
  return supabaseGet(path);
}

async function fetchEventPerformers(eventId: string) {
  const rows =
    (await supabaseGetLineup(
      `event_artists?event_id=eq.${eventId}&select=role,display_order,artists(name,slug,photo_url)&order=display_order.asc`
    )) ?? [];
  return rows
    .map((row) => ({
      role: row.role,
      ...(row.artists || {}),
    }))
    .filter((a) => a.name);
}

async function fetchBilledArtists(limit = 24) {
  const rows =
    (await supabaseGetLineup(
      `event_artists?select=artists(slug,name,genre,city),events(status,deleted_at,date,title)&limit=120`
    )) ?? [];
  const seen = new Set<string>();
  const out: { href: string; name: string; extra?: string }[] = [];
  for (const row of rows) {
    const a = row.artists;
    const e = row.events;
    if (!a?.slug || !a.name || seen.has(a.slug)) continue;
    if (e?.status !== "PUBLISHED" || e.deleted_at) continue;
    seen.add(a.slug);
    out.push({
      href: `https://tembas.com/artists/${a.slug}`,
      name: a.name,
      extra: [a.genre, a.city].filter(Boolean).join(" · "),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Published shows of one artist, split into upcoming (soonest first) and past. */
async function fetchArtistShows(artistId: string) {
  const rows =
    (await supabaseGetLineup(
      `event_artists?artist_id=eq.${artistId}&select=role,events(id,slug,title,date,location,city,status,deleted_at,is_permanent,event_dates(date,status))`
    )) ?? [];
  const shows = rows
    .map((row) => ({ role: row.role, ...(row.events || {}) }))
    .filter((e) => e.id && e.status === "PUBLISHED" && !e.deleted_at);
  return splitArtistShows(shows, todayYmdOuaga());
}

function artistSameAs(social: Record<string, string> | null | undefined): string[] {
  if (!social || typeof social !== "object") return [];
  const out: string[] = [];
  const push = (kind: string, raw?: string) => {
    const v = String(raw || "").trim();
    if (!v) return;
    if (/^https?:\/\//i.test(v)) {
      out.push(v);
      return;
    }
    const handle = v.replace(/^@/, "").replace(/^\//, "");
    if (kind === "instagram") out.push(`https://www.instagram.com/${handle}`);
    else if (kind === "facebook") out.push(`https://www.facebook.com/${handle}`);
    else if (kind === "twitter") out.push(`https://twitter.com/${handle}`);
    else if (kind === "youtube") {
      out.push(`https://www.youtube.com/${handle.includes("/") ? handle : `@${handle}`}`);
    } else if (kind === "website") out.push(v.startsWith("http") ? v : `https://${v}`);
  };
  push("instagram", social.instagram);
  push("facebook", social.facebook);
  push("youtube", social.youtube);
  push("twitter", social.twitter);
  push("website", social.website);
  return Array.from(new Set(out));
}

function clampMeta(text: string, max = 158) {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 80 ? cut.slice(0, sp) : cut).trim()}…`;
}

async function fetchEvent(param: string) {
  const key = decodeURIComponent(param);
  const select =
    "id,slug,title,description,image_url,date,time,timezone,location,city,address,region,country_code,currency,price,is_permanent,status,venue_id,organizer_id,ticket_types(id,name,price,available,sales_enabled),event_dates(date,start_time,end_time,status)";
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key
    );
  const filter = isUuid ? `id=eq.${key}` : `slug=eq.${encodeEq(key)}`;
  const rows = await supabaseGet(
    `events?${filter}&status=eq.PUBLISHED&deleted_at=is.null&select=${select}`
  );
  // undefined = lookup failed (network, config): never 404 on an error.
  if (rows === null) return undefined;
  return rows[0] ?? null;
}

/** Real organizer name and real venue row for the Event JSON-LD. */
async function fetchEventExtras(event: any) {
  const [orgRows, venueRows] = await Promise.all([
    event?.organizer_id
      ? supabaseGet(
          `organizer_profiles?organizer_id=eq.${encodeEq(event.organizer_id)}&select=business_name,slug&limit=1`
        )
      : Promise.resolve(null),
    event?.venue_id
      ? supabaseGet(`venues?id=eq.${encodeEq(event.venue_id)}&select=name,address,city&limit=1`)
      : Promise.resolve(null),
  ]);
  const org = orgRows?.[0];
  const venue = venueRows?.[0];
  const orgName = String(org?.business_name ?? "").trim();
  return {
    organizer: orgName
      ? { name: orgName, url: org?.slug ? `https://tembas.com/organizers/${org.slug}` : null }
      : null,
    venue: venue ?? null,
    dates: Array.isArray(event?.event_dates) ? event.event_dates : [],
  };
}

function eventPublicPath(event: { id: string; slug?: string | null }): string {
  const slug = String(event.slug ?? "").trim();
  return `/e/${slug || event.id}`;
}

function todayYmdOuaga(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Ouagadougou",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${mo}-${d}`;
}

async function fetchPublishedEvents(limit = 30) {
  const today = todayYmdOuaga();
  return (
    (await supabaseGet(
      `events?select=id,slug,title,date,location,city,image_url,is_permanent,price,currency,country_code&status=eq.PUBLISHED&deleted_at=is.null&or=(is_permanent.eq.true,date.gte.${today})&order=date.asc.nullslast&limit=${limit}`
    )) ?? []
  );
}

function formatFrDate(date?: string | null): string {
  if (!date) return "";
  const m = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  try {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(
      "fr-FR",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );
  } catch {
    return "";
  }
}

function encodeEq(value: string): string {
  return encodeURIComponent(value);
}

/** Row, null when there is no such slug, undefined when the lookup failed. */
async function fetchBySlug(table: string, slug: string, select: string) {
  const rows = await supabaseGet(
    `${table}?slug=eq.${encodeEq(slug)}&select=${select}&limit=1`
  );
  if (rows === null) return undefined;
  return rows[0] ?? null;
}

/** Venue pages that really exist (same rule as the SPA catalog). null on failure. */
async function fetchVenueIndex() {
  const [venues, events] = await Promise.all([
    supabaseGet("venues?select=id,name,slug,city,address,country_code"),
    supabaseGet("events?select=id,venue_id,deleted_at&status=eq.PUBLISHED&deleted_at=is.null&venue_id=not.is.null"),
  ]);
  if (venues === null || events === null) return null;
  return buildVenueIndex(venues as VenueRowLite[], events);
}

function layout(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  ogType?: string;
  robots?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  body: string;
}): string {
  const rawTitle = opts.title.trim();
  const title = escapeHtml(
    /temba/i.test(rawTitle) ? rawTitle : `${rawTitle} | Temba`
  );
  const description = escapeHtml(opts.description.slice(0, 220));
  const url = escapeHtml(opts.url);
  const imageRaw = opts.image || TEMBA_OG_IMAGE;
  const image = escapeHtml(imageRaw);
  const imageLower = imageRaw.toLowerCase();
  const imageType = imageLower.includes(".png")
    ? "image/png"
    : imageLower.includes(".webp")
      ? "image/webp"
      : imageLower.includes(".jpg") || imageLower.includes(".jpeg")
        ? "image/jpeg"
        : "";
  const imageTypeTag = imageType
    ? `  <meta property="og:image:type" content="${imageType}" />
`
    : "";
  const ogType = escapeHtml(opts.ogType || "website");
  const robots = escapeHtml(opts.robots || "index, follow");
  const jsonLd = opts.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="${robots}" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" href="https://tembas.com/favicon.ico?v=4" sizes="48x48" />
  <link rel="icon" type="image/png" sizes="192x192" href="https://tembas.com/icon-192-v2.png?v=3" />
  <link rel="icon" type="image/svg+xml" href="https://tembas.com/favicon.svg?v=4" />
  <link rel="icon" type="image/png" sizes="32x32" href="https://tembas.com/favicon-32x32.png?v=3" />
  <link rel="apple-touch-icon" sizes="180x180" href="https://tembas.com/apple-touch-icon-v2.png?v=3" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Temba" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
${imageTypeTag}  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${title}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:locale" content="fr_BF" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  ${jsonLd}
</head>
<body>
  <header>
    <p><a href="https://tembas.com/">Temba</a> — Billetterie en ligne, Afrique de l'Ouest</p>
  </header>
  ${opts.body}
  <nav>
    <a href="https://tembas.com/events">Événements</a> ·
    <a href="https://tembas.com/ce-weekend">Ce week-end</a> ·
    <a href="https://tembas.com/ouagadougou/concerts">Concerts à Ouagadougou</a> ·
    <a href="https://tembas.com/ouagadougou">Ouagadougou</a> ·
    <a href="https://tembas.com/bobo-dioulasso">Bobo-Dioulasso</a> ·
    <a href="https://tembas.com/abidjan">Abidjan</a> ·
    <a href="https://tembas.com/dakar">Dakar</a> ·
    <a href="https://tembas.com/artists">Artistes</a> ·
    <a href="https://tembas.com/attractions">Attractions</a> ·
    <a href="https://tembas.com/venues">Lieux</a> ·
    <a href="https://tembas.com/organizers">Organisateurs</a> ·
    <a href="https://tembas.com/blog">Blog</a>
  </nav>
</body>
</html>`;
}

function eventListHtml(events: any[]): string {
  if (!events.length) return "<p>Aucun événement publié pour le moment.</p>";
  return `<ul>${events
    .map((e) => {
      const date = e.is_permanent ? "Ouvert toute l'année" : formatFrDate(e.date);
      const place = e.city || e.location || "";
      return `<li><a href="https://tembas.com${eventPublicPath(e)}">${escapeHtml(e.title)}</a>${
        date || place ? ` — ${escapeHtml([date, place].filter(Boolean).join(" · "))}` : ""
      }</li>`;
    })
    .join("")}</ul>`;
}

/** Landing page list: multi-day events show "du … au …" instead of only their first day. */
function landingListHtml(events: any[], dates: Map<string, string[]>): string {
  return `<ul>${events
    .map((e) => {
      const days = [...new Set([String(e.date || "").slice(0, 10), ...(dates.get(e.id) ?? [])].filter(Boolean))].sort();
      const first = days[0];
      const last = days[days.length - 1];
      const when = first && last && first !== last
        ? `du ${formatFrDate(first)} au ${formatFrDate(last)}`
        : formatFrDate(e.date);
      const place = e.city || e.location || "";
      return `<li><a href="https://tembas.com${eventPublicPath(e)}">${escapeHtml(e.title)}</a>${
        when || place ? ` — ${escapeHtml([when, place].filter(Boolean).join(" · "))}` : ""
      }</li>`;
    })
    .join("")}</ul>`;
}

function generateEventHtml(
  event: any,
  requestParam: string,
  related: any[],
  performers: { name: string; slug?: string; role?: string }[] = [],
  origin = TEMBA_ORIGIN,
  extras: {
    organizer?: { name: string; url?: string | null } | null;
    venue?: { name?: string | null; address?: string | null; city?: string | null } | null;
    dates?: { date?: string | null; start_time?: string | null; end_time?: string | null; status?: string | null }[];
  } = {},
): string {
  const title = event?.title || "Événement Temba";
  const rawDesc = stripHtml(event?.description);
  const location = eventShareLocation(event || {});
  const eventDate = event?.is_permanent ? "Ouvert toute l'année" : formatFrDate(event?.date);
  const eventTime = event?.time || "";
  const description = eventShareDescription({
    title,
    description: rawDesc,
    dateLabel: eventDate,
    location,
  });
  const eventUrl = `https://tembas.com${
    event ? eventPublicPath(event) : `/e/${requestParam}`
  }`;
  // First-party /og/e proxy so WhatsApp can fetch a 1200×630 JPEG.
  // The on-page <img> and JSON-LD keep the original flyer URL.
  const flyerUrl =
    toAbsoluteHttps(event?.image_url) || event?.image_url || TEMBA_OG_IMAGE;
  const imageUrl = event?.image_url
    ? eventOgImageUrl(event, event.image_url, origin)
    : TEMBA_OG_IMAGE;
  const tickets: any[] = event?.ticket_types || [];

  const jsonLd = event
    ? buildEventJsonLd(event, {
        url: eventUrl,
        image: event.image_url ? flyerUrl : null,
        organizer: extras.organizer ?? null,
        venue: extras.venue ?? null,
        performers,
        dates: extras.dates ?? [],
      }) ?? undefined
    : undefined;

  // A price of 0 or no price is not "free": show the tier name only.
  const ticketLines = tickets
    .map((t) => {
      const price = realPrice(t.price);
      return `<li>${escapeHtml(String(t.name || "Billet").trim())}${
        price !== null ? ` — ${escapeHtml(formatFcfa(price))}` : ""
      }</li>`;
    })
    .join("");

  const artistLines = performers
    .map((a) => {
      const href = a.slug ? `https://tembas.com/artists/${a.slug}` : "";
      const name = escapeHtml(a.name);
      return `<li>${href ? `<a href="${escapeHtml(href)}">${name}</a>` : name}</li>`;
    })
    .join("");

  const body = `
  <article>
    <h1>${escapeHtml(title)}</h1>
    ${eventDate ? `<p>Date : ${escapeHtml(eventDate)}${eventTime ? ` à ${escapeHtml(eventTime)}` : ""}</p>` : ""}
    ${location ? `<p>Lieu : ${escapeHtml(location)}</p>` : ""}
    ${extras.organizer?.name ? `<p>Organisé par ${escapeHtml(extras.organizer.name.trim())}</p>` : ""}
    ${fullDescription(event?.description, description)}
    ${artistLines ? `<h2>À l'affiche</h2><ul>${artistLines}</ul>` : ""}
    ${ticketLines ? `<h2>Tarifs</h2><ul>${ticketLines}</ul>` : ""}
    <p><a href="${escapeHtml(eventUrl)}">Acheter des billets sur Temba</a></p>
    ${event?.image_url ? `<img src="${escapeHtml(flyerUrl)}" alt="${escapeHtml(title)}" />` : ""}
  </article>
  <h2>Autres événements</h2>
  ${eventListHtml(related.filter((e) => e.id !== event?.id).slice(0, 12))}
  `;

  return layout({
    // City and date in the title: "Alif Naaba — Ouagadougou, 26 décembre 2026".
    title: event ? eventSeoTitle(event, extras.dates ?? event.event_dates ?? []) : title,
    description,
    url: eventUrl,
    image: imageUrl,
    ogType: "event",
    jsonLd,
    body,
  });
}

/** Full event text for crawlers, one <p> per paragraph. Falls back to the short line. */
function fullDescription(raw: unknown, fallback: string): string {
  const text = stripTags(raw);
  if (!text) return `<p>${escapeHtml(fallback)}</p>`;
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n    ");
}

/** Real 404 for crawlers: status 404 and noindex, so Google drops the URL. */
function notFoundResponse(opts: {
  title: string;
  text: string;
  url: string;
  back: { href: string; label: string };
  headers: Record<string, string>;
}): Response {
  return new Response(
    layout({
      title: opts.title,
      description: opts.text,
      url: opts.url,
      robots: "noindex, follow",
      body: `<h1>${escapeHtml(opts.title)}</h1><p>${escapeHtml(opts.text)}</p><p><a href="${escapeHtml(opts.back.href)}">${escapeHtml(opts.back.label)}</a></p>`,
    }),
    { status: 404, headers: { ...opts.headers, "X-Robots-Tag": "noindex" } }
  );
}

function linkList(
  items: { href: string; name: string; extra?: string }[]
): string {
  if (!items.length) return "<p>Rien à afficher pour le moment.</p>";
  return `<ul>${items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.name)}</a>${
          item.extra ? ` — ${escapeHtml(item.extra)}` : ""
        }</li>`
    )
    .join("")}</ul>`;
}

function generateCollectionHtml(opts: {
  title: string;
  description: string;
  url: string;
  items: { href: string; name: string; extra?: string }[];
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}): string {
  return layout({
    title: opts.title,
    description: opts.description,
    url: opts.url,
    image: opts.image,
    jsonLd: opts.jsonLd ?? {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: opts.title,
      url: opts.url,
      description: opts.description,
    },
    body: `<h1>${escapeHtml(opts.title)}</h1><p>${escapeHtml(opts.description)}</p>${linkList(opts.items)}`,
  });
}

function generateListingHtml(events: any[]): string {
  const title = "Événements — Concerts, festivals et attractions";
  const description =
    "Agenda Temba : concerts, festivals, spectacles et attractions permanentes en Afrique de l'Ouest. Achetez vos billets en FCFA.";
  return layout({
    title,
    description,
    url: "https://tembas.com/events",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Événements Temba",
      itemListElement: events.slice(0, 20).map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://tembas.com${eventPublicPath(e)}`,
        name: e.title,
      })),
    },
    body: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>
      ${eventListHtml(events)}
      <p><a href="https://tembas.com/artists">Artistes — concerts et billets</a></p>`,
  });
}

function generateHomeHtml(events: any[], artists: { href: string; name: string; extra?: string }[] = []) {
  const title = "Temba – N°1 Billetterie Burkina Faso | Concerts, Festivals & Événements";
  const description =
    "Achetez vos billets en ligne pour les concerts, festivals et événements à Ouagadougou et partout au Burkina Faso. Paiement sécurisé en FCFA.";
  const upcoming = events.slice(0, 24);
  return layout({
    title,
    description,
    url: "https://tembas.com/",
    image: TEMBA_OG_IMAGE,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://tembas.com/#organization",
        name: "Temba",
        alternateName: "Temba Billetterie",
        url: "https://tembas.com/",
        logo: {
          "@type": "ImageObject",
          url: TEMBA_LOGO_SQUARE,
          width: 512,
          height: 512,
        },
        description,
        areaServed: ["BF", "CI", "SN"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Ouagadougou",
          addressCountry: "BF",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+22674750815",
          email: "support@tembas.com",
          contactType: "customer support",
          availableLanguage: "French",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://tembas.com/#website",
        name: "Temba",
        alternateName: ["Temba Billetterie"],
        url: "https://tembas.com/",
        inLanguage: "fr-BF",
        publisher: { "@id": "https://tembas.com/#organization" },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Événements à l'affiche",
        itemListElement: upcoming.map((e, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://tembas.com${eventPublicPath(e)}`,
          name: e.title,
        })),
      },
    ],
    body: `<h1>Temba — Billetterie n°1 au Burkina Faso</h1>
      <p>${escapeHtml(description)}</p>
      <p>Orange Money, Moov Money ou carte. Billet QR sur le téléphone. Support à Ouagadougou : support@tembas.com · +226 74 75 08 15.</p>
      <h2>Villes</h2>
      <ul>
        <li><a href="https://tembas.com/ouagadougou">Événements à Ouagadougou</a></li>
        <li><a href="https://tembas.com/bobo-dioulasso">Événements à Bobo-Dioulasso</a></li>
        <li><a href="https://tembas.com/abidjan">Événements à Abidjan</a></li>
        <li><a href="https://tembas.com/dakar">Événements à Dakar</a></li>
      </ul>
      <h2>Événements à l'affiche</h2>
      ${eventListHtml(upcoming)}
      <p><a href="https://tembas.com/events">Tout l’agenda</a> · <a href="https://tembas.com/attractions">Attractions</a></p>
      <h2>Artistes — concerts et billets</h2>
      <p><a href="https://tembas.com/artists">Tous les artistes sur Temba</a></p>
      ${artists.length ? linkList(artists) : ""}`,
  });
}

function generateReferralHtml(referralCode: string): string {
  const title = "Rejoignez TEMBA et gagnez des récompenses";
  const description =
    "Utilisez ce code de parrainage pour recevoir des crédits gratuits sur vos premiers achats de billets.";
  return layout({
    title,
    description,
    url: `https://tembas.com/ref/${encodeURIComponent(referralCode)}`,
    robots: "noindex, follow",
    body: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>
      <p>Code : <strong>${escapeHtml(referralCode)}</strong></p>
      <p><a href="https://tembas.com/ref/${escapeHtml(referralCode)}">Rejoindre Temba</a></p>`,
  });
}

/** Crawler canonical redirects must not drop ?r= from a shared or OneLink URL. */
function redirectKeepingQuery(pathname: string, search: string): Response {
  const target = new URL(pathname, "https://tembas.com");
  const incoming = new URLSearchParams(search);
  incoming.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.append(key, value);
  });
  return Response.redirect(target.toString(), 301);
}

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent");

  if (!isCrawler(userAgent)) {
    return context.next();
  }

  const htmlHeaders = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=600",
  };

  if (url.pathname === "/" || url.pathname === "") {
    const [events, artists] = await Promise.all([
      fetchPublishedEvents(20),
      fetchBilledArtists(24),
    ]);
    return new Response(generateHomeHtml(events, artists), { headers: htmlHeaders });
  }

  if (url.pathname === "/events" || url.pathname === "/events/") {
    const events = await fetchPublishedEvents(40);
    return new Response(generateListingHtml(events), { headers: htmlHeaders });
  }

  const eventMatch = url.pathname.match(/^\/(e|event|events)\/([^/]+)$/);
  if (eventMatch) {
    const requestParam = decodeURIComponent(eventMatch[2]);
    const [event, related] = await Promise.all([
      fetchEvent(requestParam),
      fetchPublishedEvents(12),
    ]);
    if (event === undefined) return context.next();
    if (event) {
      const canonical = eventPublicPath(event);
      if (url.pathname !== canonical) {
        return redirectKeepingQuery(canonical, url.search);
      }
      const [performers, extras] = await Promise.all([
        fetchEventPerformers(event.id),
        fetchEventExtras(event),
      ]);
      return new Response(
        generateEventHtml(event, requestParam, related, performers, publicSiteOrigin(request.url), extras),
        { headers: htmlHeaders }
      );
    }
    return notFoundResponse({
      title: "Événement introuvable",
      text: "Cet événement n’existe pas ou n’est plus en ligne sur Temba.",
      url: `https://tembas.com/e/${encodeURIComponent(requestParam)}`,
      back: { href: "https://tembas.com/events", label: "Voir l’agenda" },
      headers: htmlHeaders,
    });
  }

  if (url.pathname === "/attractions" || url.pathname === "/attractions/") {
    const events = (await fetchPublishedEvents(40)).filter((e) => e.is_permanent);
    return new Response(
      generateCollectionHtml({
        title: "Attractions — Parcs, musées et lieux permanents",
        description:
          "Réservez vos visites : parcs, musées et attractions ouvertes toute l'année. Billets en FCFA sur Temba.",
        url: "https://tembas.com/attractions",
        items: events.map((e) => ({
          href: `https://tembas.com${eventPublicPath(e)}`,
          name: e.title,
          extra: e.city || e.location || "",
        })),
      }),
      { headers: htmlHeaders }
    );
  }

  if (url.pathname === "/venues" || url.pathname === "/venues/") {
    const index = await fetchVenueIndex();
    if (!index) return context.next();
    return new Response(
      generateCollectionHtml({
        title: "Lieux — Salles et sites",
        description: "Découvrez les salles et sites partenaires de Temba au Burkina Faso et en Afrique de l'Ouest.",
        url: "https://tembas.com/venues",
        items: index.pages.map((v) => ({
          href: `https://tembas.com/venues/${v.primarySlug}`,
          name: v.name,
          extra: v.city || "",
        })),
      }),
      { headers: htmlHeaders }
    );
  }

  const venueMatch = url.pathname.match(/^\/venues\/([^/]+)$/);
  if (venueMatch) {
    const slug = decodeURIComponent(venueMatch[1]);
    const [index, venue] = await Promise.all([
      fetchVenueIndex(),
      fetchBySlug("venues", slug, "id,slug,name,description,city,address,photos"),
    ]);
    if (!index || venue === undefined) return context.next();
    const page = index.bySlug.get(slug);
    // Unknown slug, test rows ("dfyguh"), city-only rows and venues with no
    // published event are not pages on the site (the SPA shows "Lieu introuvable").
    if (!venue || !page) {
      return notFoundResponse({
        title: "Lieu introuvable",
        text: "Cette fiche lieu n’existe pas sur Temba.",
        url: `https://tembas.com/venues/${encodeURIComponent(slug)}`,
        back: { href: "https://tembas.com/venues", label: "Voir tous les lieux" },
        headers: htmlHeaders,
      });
    }
    const canonical = `https://tembas.com/venues/${page.primarySlug}`;
    const name = page.name || venue.name || slug;
    const photo = Array.isArray(venue?.photos) ? venue.photos[0] : undefined;
    const today = todayYmdOuaga();
    const shows =
      (await supabaseGet(
        `events?select=id,slug,title,date,city,location,is_permanent&status=eq.PUBLISHED&deleted_at=is.null&venue_id=in.(${page.ids.join(",")})&order=date.asc.nullslast&limit=60`
      )) ?? [];
    const upcoming = shows.filter((e) => e.is_permanent || String(e.date || "") >= today);
    const past = shows.filter((e) => !e.is_permanent && String(e.date || "") < today).reverse();
    const city = page.city || venue.city || "";
    return new Response(
      layout({
        title: `${name}${city ? ` à ${city}` : ""} — événements et billets`,
        description:
          stripHtml(venue?.description) ||
          `Événements à ${name}${city ? ` (${city})` : ""} : agenda et billets en FCFA sur Temba.`,
        url: canonical,
        image: photo,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Place",
          name,
          url: canonical,
          address: {
            "@type": "PostalAddress",
            ...(venue.address && venue.address !== venue.name ? { streetAddress: venue.address } : {}),
            ...(city ? { addressLocality: city } : {}),
          },
        },
        body: `<h1>${escapeHtml(name)}</h1>
      ${city ? `<p>${escapeHtml(city)}</p>` : ""}
      <h2>Prochains événements</h2>
      ${upcoming.length ? eventListHtml(upcoming) : "<p>Pas de date à venir pour le moment.</p>"}
      ${past.length ? `<h2>Déjà passés ici</h2>${eventListHtml(past.slice(0, 20))}` : ""}
      <p><a href="https://tembas.com/venues">Tous les lieux</a> · <a href="https://tembas.com/events">Agenda Temba</a></p>`,
      }),
      { headers: htmlHeaders }
    );
  }

  if (url.pathname === "/organizers" || url.pathname === "/organizers/") {
    const organizers =
      (await supabaseGet(
        "organizer_profiles?select=slug,business_name,city&slug=not.is.null&order=business_name.asc&limit=40"
      )) ?? [];
    return new Response(
      generateCollectionHtml({
        title: "Organisateurs",
        description: "Profils publics des organisateurs Temba. Concerts, festivals et attractions.",
        url: "https://tembas.com/organizers",
        items: organizers
          .filter((o) => o.slug)
          .map((o) => ({
            href: `https://tembas.com/organizers/${o.slug}`,
            name: o.business_name,
            extra: o.city || "",
          })),
      }),
      { headers: htmlHeaders }
    );
  }

  const organizerMatch = url.pathname.match(/^\/organizers\/([^/]+)$/);
  if (organizerMatch) {
    const slug = decodeURIComponent(organizerMatch[1]);
    const org = await fetchBySlug(
      "organizer_profiles",
      slug,
      "slug,business_name,bio,logo_url,cover_image_url,city"
    );
    if (org === undefined) return context.next();
    if (!org) {
      return notFoundResponse({
        title: "Organisateur introuvable",
        text: "Ce profil n’existe pas ou a été supprimé.",
        url: `https://tembas.com/organizers/${encodeURIComponent(slug)}`,
        back: { href: "https://tembas.com/events", label: "Voir les événements" },
        headers: htmlHeaders,
      });
    }
    const name = org?.business_name || slug;
    return new Response(
      generateCollectionHtml({
        title: name,
        description:
          stripHtml(org?.bio) || `Événements organisés par ${name} — billets sur Temba.`,
        url: `https://tembas.com/organizers/${slug}`,
        image: org?.cover_image_url || org?.logo_url,
        items: [
          { href: "https://tembas.com/organizers", name: "Tous les organisateurs" },
          { href: "https://tembas.com/events", name: "Agenda Temba" },
        ],
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Organization",
          name,
          url: `https://tembas.com/organizers/${slug}`,
        },
      }),
      { headers: htmlHeaders }
    );
  }

  if (url.pathname === "/artists" || url.pathname === "/artists/") {
    const artists =
      (await supabaseGet(
        "artists?select=slug,name,genre,city&slug=not.is.null&order=name.asc&limit=200"
      )) ?? [];
    const items = artists
      .filter((a) => a.slug)
      .map((a) => ({
        href: `https://tembas.com/artists/${a.slug}`,
        name: a.name,
        extra: [a.genre, a.city].filter(Boolean).join(" · "),
      }));
    const description =
      "Fiches officielles des artistes programmés sur Temba : concerts à Ouagadougou et en Afrique de l’Ouest, dates publiées et billets en FCFA.";
    return new Response(
      generateCollectionHtml({
        title: "Artistes — concerts et billets Burkina Faso",
        description,
        url: "https://tembas.com/artists",
        items,
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Artistes — Temba",
            url: "https://tembas.com/artists",
            description,
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Artistes Temba",
            itemListElement: items.slice(0, 80).map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: a.href,
              name: a.name,
            })),
          },
        ],
      }),
      { headers: htmlHeaders }
    );
  }

  const artistMatch = url.pathname.match(/^\/artists\/([^/]+)$/);
  if (artistMatch) {
    const slug = decodeURIComponent(artistMatch[1]);
    const artist = await fetchBySlug(
      "artists",
      slug,
      "id,slug,name,bio,photo_url,cover_image_url,genre,city,country_code,social_links,verified"
    );
    if (artist === undefined) return context.next();
    if (!artist) {
      return new Response(
        layout({
          title: "Artiste introuvable",
          description: "Cette fiche artiste n’existe pas sur Temba.",
          url: `https://tembas.com/artists/${slug}`,
          robots: "noindex, follow",
          body: `<h1>Artiste introuvable</h1><p>Cette fiche n’existe pas, ou le lien a changé.</p><p><a href="https://tembas.com/artists">Tous les artistes</a></p>`,
        }),
        { status: 404, headers: { ...htmlHeaders, "X-Robots-Tag": "noindex" } }
      );
    }
    const name = artist.name || slug;
    const pageUrl = `https://tembas.com/artists/${artist.slug || slug}`;
    const { upcoming, past } = artist.id ? await fetchArtistShows(artist.id) : { upcoming: [], past: [] };
    const shows = [...upcoming, ...past];
    // Only a real upcoming show counts as "next": past shows never read as upcoming.
    const next = upcoming[0];
    const description = next?.title
      ? clampMeta(
          `${name}${artist.genre ? ` (${artist.genre})` : ""} : « ${next.title} »${
            next.first ? ` le ${formatFrDate(next.first)}` : ""
          }${next.location || next.city ? ` à ${next.city || next.location}` : ""}. Billets officiels sur Temba.`
        )
      : clampMeta(
          stripHtml(artist.bio) ||
            `Fiche officielle de ${name}${artist.genre ? `, ${artist.genre}` : ""} sur Temba. Dates publiées et billets en FCFA.`
        );
    const sameAs = artistSameAs(artist.social_links);
    const jsonLd: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: "https://tembas.com/" },
          { "@type": "ListItem", position: 2, name: "Artistes", item: "https://tembas.com/artists" },
          { "@type": "ListItem", position: 3, name, item: pageUrl },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": ["Person", "MusicGroup"],
        "@id": pageUrl,
        name,
        url: pageUrl,
        image: artist.photo_url || undefined,
        description: stripHtml(artist.bio) || undefined,
        genre: artist.genre || undefined,
        sameAs: sameAs.length ? sameAs : undefined,
        homeLocation: artist.city
          ? {
              "@type": "Place",
              name: artist.city,
              address: {
                "@type": "PostalAddress",
                addressLocality: artist.city,
                addressCountry: artist.country_code || "BF",
              },
            }
          : undefined,
        performerIn: shows.length
          ? shows.map((s) => ({
              "@type": "MusicEvent",
              name: s.title,
              url: `https://tembas.com${eventPublicPath(s)}`,
              startDate: s.first || undefined,
              location: {
                "@type": "Place",
                name: s.city || s.location || "Afrique de l'Ouest",
              },
            }))
          : undefined,
      },
    ];
    const place = next?.city || artist.city || "Ouagadougou";
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Où acheter des billets pour ${name} ?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Sur Temba, fiche officielle ${name}. Seuls les concerts réellement mis en vente sur tembas.com sont listés.`,
          },
        },
        {
          "@type": "Question",
          name: next ? `${name} en concert à ${place} ?` : `Prochain concert de ${name} ?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: next?.title
              ? `Oui : « ${next.title} »${next.first ? ` le ${formatFrDate(next.first)}` : ""}. Billets sur Temba.`
              : `${name} n’a pas de date à venir publiée sur Temba pour l’instant.`,
          },
        },
      ],
    });
    const showItem = (s: (typeof shows)[number]) => ({
      href: `https://tembas.com${eventPublicPath(s)}`,
      name: s.title,
      extra: [s.is_permanent ? "Ouvert toute l'année" : frDayRange(s.first, s.last), s.city || s.location].filter(Boolean).join(" · "),
    });
    const upcomingItems = upcoming.map(showItem);
    const pastItems = past.map(showItem);
    const bio = stripHtml(artist.bio);
    const body = `<article>
      <nav><a href="https://tembas.com/artists">Artistes</a> / ${escapeHtml(name)}</nav>
      <h1>${escapeHtml(name)}</h1>
      ${artist.genre ? `<p>${escapeHtml(artist.genre)}${artist.city ? ` · ${escapeHtml(artist.city)}` : ""}</p>` : ""}
      ${bio ? `<p>${escapeHtml(bio)}</p>` : ""}
      <p>Fiche officielle Temba : seuls les concerts réellement mis en vente sur la plateforme sont listés.</p>
      ${artist.photo_url ? `<img src="${escapeHtml(artist.photo_url)}" alt="${escapeHtml(name)}, artiste" />` : ""}
      <h2>Prochaines dates</h2>
      ${upcomingItems.length ? linkList(upcomingItems) : "<p>Pas de date à venir sur Temba pour l’instant.</p>"}
      ${pastItems.length ? `<h2>Déjà passé sur Temba</h2>${linkList(pastItems)}` : ""}
      <h2>Où acheter des billets pour ${escapeHtml(name)} ?</h2>
      <p>Sur Temba. Orange Money, Moov Money ou carte — QR sur le téléphone.</p>
    </article>`;
    // "concert à …" only when a real upcoming show exists.
    const seoTitle = artistPageTitle(name, next ? { city: next.city, location: next.location } : null);
    return new Response(
      layout({
        title: seoTitle,
        description,
        url: pageUrl,
        image: artist.photo_url || artist.cover_image_url,
        ogType: "profile",
        jsonLd,
        body,
      }),
      { headers: htmlHeaders }
    );
  }

  if (url.pathname === "/categories" || url.pathname === "/categories/") {
    const categories =
      (await supabaseGet("categories?select=id,name,description&order=name.asc&limit=40")) ??
      [];
    return new Response(
      generateCollectionHtml({
        title: "Catégories d'événements",
        description:
          "Concerts, festivals, spectacles et sorties : parcourez les catégories Temba.",
        url: "https://tembas.com/categories",
        items: categories.map((c) => {
          const slug = frenchCategorySlug(c, c.slug || c.id);
          return {
            href: `https://tembas.com/categories/${slug}`,
            name: frenchCategoryName(slug, c.name),
            extra: stripHtml(c.description).slice(0, 80),
          };
        }),
      }),
      { headers: htmlHeaders }
    );
  }

  const categoryMatch = url.pathname.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const key = decodeURIComponent(categoryMatch[1]);
    // The categories table has no slug column: match the public French slug
    // (or the id) against the few rows instead of querying by slug.
    const rows = await supabaseGet("categories?select=id,name,description&limit=100");
    if (rows !== null) {
      const hit = rows.find((c) => c.id === key || frenchCategorySlug(c, String(c.id)) === frenchCategorySlug(null, key));
      rows.splice(0, rows.length, ...(hit ? [hit] : []));
    }
    if (rows === null) return context.next();
    const category = rows?.[0];
    if (!category) {
      return notFoundResponse({
        title: "Catégorie introuvable",
        text: "Cette catégorie n’existe pas sur Temba.",
        url: `https://tembas.com/categories/${encodeURIComponent(key)}`,
        back: { href: "https://tembas.com/categories", label: "Toutes les catégories" },
        headers: htmlHeaders,
      });
    }
    const publicSlug = frenchCategorySlug(category, key);
    if (category && key !== publicSlug) {
      return redirectKeepingQuery(`/categories/${publicSlug}`, url.search);
    }
    const name = frenchCategoryName(publicSlug, category?.name || key);
    let items: { href: string; name: string; extra?: string }[] = [
      { href: "https://tembas.com/categories", name: "Toutes les catégories" },
      { href: "https://tembas.com/events", name: "Agenda Temba" },
    ];
    if (category?.id) {
      const rels =
        (await supabaseGet(
          `event_category_relations?category_id=eq.${category.id}&select=event_id&limit=40`
        )) ?? [];
      const ids = [...new Set(rels.map((r) => r.event_id).filter(Boolean))];
      if (ids.length) {
        const listed =
          (await supabaseGet(
            `events?id=in.(${ids.join(",")})&status=eq.PUBLISHED&deleted_at=is.null&select=id,slug,title,city,location&limit=40`
          )) ?? [];
        if (listed.length) {
          items = listed.map((e) => ({
            href: `https://tembas.com${eventPublicPath(e)}`,
            name: e.title,
            extra: e.city || e.location || "",
          }));
        }
      }
    }
    return new Response(
      generateCollectionHtml({
        title: `${name} — billets Temba`,
        description:
          stripHtml(category?.description) ||
          `Événements ${name} au Burkina Faso — billets en FCFA sur Temba.`,
        url: `https://tembas.com/categories/${publicSlug}`,
        items,
      }),
      { headers: htmlHeaders }
    );
  }

  if (url.pathname === "/blog" || url.pathname === "/blog/") {
    const posts =
      (await supabaseGet(
        "blog_posts?select=slug,title,excerpt,published_at&status=eq.PUBLISHED&order=published_at.desc.nullslast&limit=20"
      )) ?? [];
    return new Response(
      generateCollectionHtml({
        title: "Blog Temba",
        description: "Conseils, agenda et coulisses de la billetterie au Burkina Faso.",
        url: "https://tembas.com/blog",
        items: posts
          .filter((p) => p.slug)
          .map((p) => ({
            href: `https://tembas.com/blog/post/${p.slug}`,
            name: p.title,
            extra: stripHtml(p.excerpt).slice(0, 80),
          })),
      }),
      { headers: htmlHeaders }
    );
  }

  const blogMatch = url.pathname.match(/^\/blog\/post\/([^/]+)$/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]);
    const post = await fetchBySlug(
      "blog_posts",
      slug,
      "slug,title,excerpt,content,featured_image_url,meta_title,meta_description,status"
    );
    if (post === undefined) return context.next();
    if (!post) {
      return notFoundResponse({
        title: "Article introuvable",
        text: "Cet article n’existe pas ou n’est plus en ligne.",
        url: `https://tembas.com/blog/post/${encodeURIComponent(slug)}`,
        back: { href: "https://tembas.com/blog", label: "Retour au blog" },
        headers: htmlHeaders,
      });
    }
    const title = post?.meta_title || post?.title || slug;
    const description =
      post?.meta_description ||
      stripHtml(post?.excerpt || post?.content).slice(0, 220) ||
      "Article du blog Temba.";
    return new Response(
      layout({
        title,
        description,
        url: `https://tembas.com/blog/post/${slug}`,
        image: post?.featured_image_url,
        ogType: "article",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description,
          url: `https://tembas.com/blog/post/${slug}`,
        },
        body: `<article><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>
          <p><a href="https://tembas.com/blog">Retour au blog</a></p></article>`,
      }),
      { headers: htmlHeaders }
    );
  }

  if (url.pathname === "/support" || url.pathname === "/support/") {
    return new Response(
      layout({
        title: "Aide et support",
        description:
          "Paiement Orange Money, QR à l’entrée, transfert de billets. Contact : support@tembas.com · +226 74 75 08 15.",
        url: "https://tembas.com/support",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Comment payer avec Orange Money ?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Choisissez Orange Money au paiement, validez le USSD. Le QR s’affiche après confirmation.",
              },
            },
            {
              "@type": "Question",
              name: "Faut-il un compte pour acheter ?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Non. Le paiement invité (Sans compte) est disponible.",
              },
            },
          ],
        },
        body: `<h1>Aide et support Temba</h1>
          <p>WhatsApp / téléphone : <a href="https://wa.me/22674750815">+226 74 75 08 15</a></p>
          <p>E-mail : <a href="mailto:support@tembas.com">support@tembas.com</a></p>
          <h2>Questions fréquentes</h2>
          <ul>
            <li>Paiement Orange Money puis QR à l’entrée</li>
            <li>Achat possible sans compte</li>
            <li>Transfert de billet depuis Mes billets</li>
          </ul>`,
      }),
      { headers: htmlHeaders }
    );
  }

  const tagMatch = url.pathname.match(/^\/tags\/([^/]+)$/);
  if (tagMatch) {
    const slug = decodeURIComponent(tagMatch[1]);
    const tag = await fetchBySlug("tags", slug, "*");
    if (tag === undefined) return context.next();
    if (!tag) {
      return notFoundResponse({
        title: "Tag introuvable",
        text: "Ce tag n’existe pas sur Temba.",
        url: `https://tembas.com/tags/${encodeURIComponent(slug)}`,
        back: { href: "https://tembas.com/events", label: "Voir les événements" },
        headers: htmlHeaders,
      });
    }
    const name = tag?.name || slug;
    return new Response(
      generateCollectionHtml({
        title: `#${name}`,
        description: stripHtml(tag?.description) || `Événements ${name} sur Temba.`,
        url: `https://tembas.com/tags/${slug}`,
        items: [{ href: "https://tembas.com/events", name: "Agenda Temba" }],
      }),
      { headers: htmlHeaders }
    );
  }

  const refMatch = url.pathname.match(/^\/ref\/([^/]+)$/);
  if (refMatch) {
    return new Response(generateReferralHtml(refMatch[1]), { headers: htmlHeaders });
  }

  const landing = landingByPath(url.pathname);
  if (landing) {
    const today = todayYmdOuaga();
    const [y, m, d] = today.split("-").map(Number);
    const since = new Date(Date.UTC(y, m - 1, d - 30)).toISOString().slice(0, 10);
    const [rows, relations, categories] = await Promise.all([
      supabaseGet(
        `events?select=id,slug,title,date,time,location,city,image_url,is_permanent,price,currency,country_code&status=eq.PUBLISHED&deleted_at=is.null&is_permanent=is.false&date=gte.${since}&order=date.asc&limit=200`
      ),
      landing.concertsOnly ? supabaseGet("event_category_relations?select=event_id,category_id") : Promise.resolve([]),
      landing.concertsOnly ? supabaseGet("categories?select=id,name") : Promise.resolve([]),
    ]);
    // Database unreachable: let the app answer rather than serve an empty page.
    if (!rows || !relations || !categories) return context.next();
    const ids = rows.map((e) => e.id).filter(Boolean);
    const dateRows = ids.length
      ? (await supabaseGet(`event_dates?select=event_id,date&event_id=in.(${ids.join(",")})`)) ?? []
      : [];
    const dates = new Map<string, string[]>();
    for (const row of dateRows) {
      const day = String(row.date || "").slice(0, 10);
      if (!day) continue;
      dates.set(row.event_id, [...(dates.get(row.event_id) ?? []), day]);
    }
    const concertCategoryIds = new Set(categories.filter((c) => isConcertCategory(c.name)).map((c) => c.id));
    const concertIds = new Set(
      relations.filter((r) => concertCategoryIds.has(r.category_id)).map((r) => r.event_id as string)
    );
    const events = selectLandingEvents(landing, rows, { today, dates, concertIds });
    const pageUrl = `https://tembas.com${landing.path}`;
    const weekend = weekendRange(today);
    const when = landing.weekend
      ? `<p>Week-end du ${escapeHtml(formatFrDate(weekend.start))} au ${escapeHtml(formatFrDate(weekend.end))}.</p>`
      : "";
    const others = LANDING_PAGES.filter((p) => p.path !== landing.path)
      .map((p) => `<a href="https://tembas.com${p.path}">${escapeHtml(p.label)}</a>`)
      .join(" · ");
    const empty = landing.weekend
      ? `<p>Aucun événement n’est encore publié pour ce week-end. Consultez <a href="https://tembas.com/events">l’agenda complet</a>.</p>`
      : `<p>Aucun concert n’est publié pour le moment. Consultez <a href="https://tembas.com/events">l’agenda complet</a>.</p>`;
    return new Response(
      layout({
        title: landing.title,
        description: landing.description,
        url: pageUrl,
        // An empty list is thin content: keep it out of Google until events are published.
        robots: events.length ? "index, follow" : "noindex, follow",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: landing.h1,
            url: pageUrl,
            description: landing.description,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: events.length,
              itemListElement: events.slice(0, 30).map((e, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://tembas.com${eventPublicPath(e)}`,
                name: e.title,
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: "https://tembas.com/" },
              { "@type": "ListItem", position: 2, name: "Événements", item: "https://tembas.com/events" },
              { "@type": "ListItem", position: 3, name: landing.label, item: pageUrl },
            ],
          },
        ],
        body: `<h1>${escapeHtml(landing.h1)}</h1>
      <p>${escapeHtml(landing.intro)}</p>
      ${when}
      ${events.length ? landingListHtml(events, dates) : empty}
      <p>Voir aussi : ${others}</p>`,
      }),
      { headers: htmlHeaders }
    );
  }

  const citySlug = url.pathname.replace(/^\/+|\/+$/g, "");
  const cityPage = CITY_PAGES[citySlug];
  if (cityPage) {
    const today = todayYmdOuaga();
    const [y, m, d] = today.split("-").map(Number);
    const since = new Date(Date.UTC(y, m - 1, d - 30)).toISOString().slice(0, 10);
    const [dated, permanents, venueIndex] = await Promise.all([
      supabaseGet(
        `events?select=id,slug,title,date,location,city,address,image_url,is_permanent,venue_id,country_code&status=eq.PUBLISHED&deleted_at=is.null&is_permanent=is.false&date=gte.${since}&order=date.asc&limit=200`
      ),
      supabaseGet(
        "events?select=id,slug,title,date,location,city,address,image_url,is_permanent,venue_id,country_code&status=eq.PUBLISHED&deleted_at=is.null&is_permanent=eq.true&limit=40"
      ),
      fetchVenueIndex(),
    ]);
    // Database unreachable: let the app answer rather than serve an empty page.
    if (dated === null) return context.next();
    const inCity = (e: any) => e?.id && eventMatchesCityPage(e, citySlug, cityPage);
    const cityDated = dated.filter(inCity);
    const attractions = (permanents ?? []).filter(inCity);
    const ids = cityDated.map((e) => e.id);
    const [dateRows, lineupRows] = ids.length
      ? await Promise.all([
          supabaseGet(`event_dates?select=event_id,date,status&event_id=in.(${ids.join(",")})`),
          supabaseGetLineup(`event_artists?event_id=in.(${ids.join(",")})&select=event_id,artists(name,slug)`),
        ])
      : [[], []];
    const datesBy = new Map<string, { date: string; status?: string }[]>();
    for (const row of dateRows ?? []) {
      datesBy.set(row.event_id, [...(datesBy.get(row.event_id) ?? []), row]);
    }
    // Upcoming = last active day is today or later (multi-day events stay listed while they run).
    const upcoming = cityDated
      .map((e) => {
        const days = [String(e.date || "").slice(0, 10), ...(datesBy.get(e.id) ?? [])
          .filter((r) => !r.status || String(r.status).toLowerCase() === "active")
          .map((r) => String(r.date).slice(0, 10))]
          .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
          .sort();
        return { ...e, first: days[0] || null, last: days[days.length - 1] || null };
      })
      .filter((e) => e.last && e.last >= today)
      .sort((a, b) => String(a.first).localeCompare(String(b.first)));
    const upcomingIds = new Set(upcoming.map((e) => e.id));

    const venuePageById = new Map<string, { name: string; slug: string }>();
    for (const page of venueIndex?.pages ?? []) {
      for (const id of page.ids) venuePageById.set(id, { name: page.name, slug: page.primarySlug });
    }
    const venues = new Map<string, { name: string; slug: string; count: number }>();
    for (const e of [...upcoming, ...attractions]) {
      const v = e.venue_id ? venuePageById.get(e.venue_id) : undefined;
      if (!v) continue;
      const prev = venues.get(v.slug);
      venues.set(v.slug, { ...v, count: (prev?.count ?? 0) + 1 });
    }
    const artists = new Map<string, { name: string; slug: string }>();
    for (const row of lineupRows ?? []) {
      const a = row.artists;
      if (!upcomingIds.has(row.event_id) || !a?.slug || !a?.name) continue;
      artists.set(a.slug, { name: a.name, slug: a.slug });
    }

    const pageUrl = `https://tembas.com/${citySlug}`;
    const next = upcoming.find((e) => String(e.first) >= today) || upcoming[0];
    const facts = [
      upcoming.length
        ? `${upcoming.length} événement${upcoming.length > 1 ? "s" : ""} en cours ou à venir à ${cityPage.name} sur Temba`
        : `Aucun événement à venir n’est publié à ${cityPage.name} pour l’instant`,
      next ? `${String(next.first) >= today ? "prochain" : "en cours"} : « ${next.title} »${String(next.first) >= today ? ` le ${formatFrDate(next.first)}` : ""}` : "",
      venues.size ? `${venues.size} lieu${venues.size > 1 ? "x" : ""}` : "",
      artists.size ? `${artists.size} artiste${artists.size > 1 ? "s" : ""} à l’affiche` : "",
      attractions.length ? `${attractions.length} attraction${attractions.length > 1 ? "s" : ""} ouverte${attractions.length > 1 ? "s" : ""} toute l’année` : "",
    ].filter(Boolean);
    const description = clampMeta(
      upcoming.length
        ? `${facts[0]}${next ? ` — ${facts[1]}` : ""}. ${cityPage.description}`
        : cityPage.description
    );
    const agenda = upcoming.map((e) => {
      const v = e.venue_id ? venuePageById.get(e.venue_id) : undefined;
      return {
        href: `https://tembas.com${eventPublicPath(e)}`,
        name: e.title,
        extra: [frDayRange(e.first, e.last), v?.name || e.location || ""].filter(Boolean).join(" · "),
      };
    });
    const concertsLanding = LANDING_PAGES.find((p) => p.path === `/${citySlug}/concerts`);
    const body = `<h1>Événements à ${escapeHtml(cityPage.name)}</h1>
      <p>${escapeHtml(facts.join(", "))}.</p>
      <h2>Agenda à ${escapeHtml(cityPage.name)}</h2>
      ${agenda.length ? linkList(agenda) : `<p>Consultez <a href="https://tembas.com/events">l’agenda complet</a>.</p>`}
      ${artists.size ? `<h2>Artistes à l’affiche à ${escapeHtml(cityPage.name)}</h2>${linkList([...artists.values()].map((a) => ({ href: `https://tembas.com/artists/${a.slug}`, name: a.name })))}` : ""}
      ${venues.size ? `<h2>Lieux</h2>${linkList([...venues.values()].map((v) => ({ href: `https://tembas.com/venues/${v.slug}`, name: v.name, extra: `${v.count} événement${v.count > 1 ? "s" : ""}` })))}` : ""}
      ${attractions.length ? `<h2>Attractions à ${escapeHtml(cityPage.name)}</h2>${linkList(attractions.map((e) => ({ href: `https://tembas.com${eventPublicPath(e)}`, name: e.title, extra: "Ouvert toute l’année" })))}` : ""}
      <p>Voir aussi : ${concertsLanding ? `<a href="https://tembas.com${concertsLanding.path}">${escapeHtml(concertsLanding.label)}</a> · ` : ""}<a href="https://tembas.com/ce-weekend">Ce week-end</a> · <a href="https://tembas.com/artists">Artistes</a></p>`;
    const listed = [...upcoming, ...attractions];
    return new Response(
      layout({
        title: cityPage.title,
        description,
        url: pageUrl,
        // Nothing to list is thin content: keep it out of Google until events are published.
        robots: listed.length ? "index, follow" : "noindex, follow",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Événements à ${cityPage.name}`,
            url: pageUrl,
            description,
            about: { "@type": "City", name: cityPage.name },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: listed.length,
              itemListElement: listed.slice(0, 30).map((e, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://tembas.com${eventPublicPath(e)}`,
                name: e.title,
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: "https://tembas.com/" },
              { "@type": "ListItem", position: 2, name: cityPage.name, item: pageUrl },
            ],
          },
        ],
        body,
      }),
      { headers: htmlHeaders }
    );
  }

  return context.next();
}

export const config = {
  path: [
    "/",
    "/events",
    "/events/*",
    "/e/*",
    "/event/*",
    "/attractions",
    "/venues",
    "/venues/*",
    "/organizers",
    "/organizers/*",
    "/artists",
    "/artists/*",
    "/categories",
    "/categories/*",
    "/blog",
    "/blog/post/*",
    "/support",
    "/tags/*",
    "/ref/*",
    "/ouagadougou",
    "/bobo-dioulasso",
    "/abidjan",
    "/dakar",
    "/ce-weekend",
    "/ouagadougou/concerts",
    "/bobo-dioulasso/concerts",
  ],
};
