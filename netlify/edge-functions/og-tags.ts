import type { Context } from "https://edge.netlify.com";

/**
 * Crawler-facing HTML for Googlebot, social bots, and other non-JS clients.
 *
 * Humans still get the React SPA (context.next()).
 * Crawlers get a faithful HTML snapshot: title, description, date, venue,
 * price, Event JSON-LD, and links to other published events.
 *
 * Do NOT add a meta-refresh — Google treats that as a redirect and drops the page.
 */

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

async function fetchEventPerformers(eventId: string) {
  const rows =
    (await supabaseGet(
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
    (await supabaseGet(
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

async function fetchArtistPublishedShows(artistId: string) {
  const rows =
    (await supabaseGet(
      `event_artists?artist_id=eq.${artistId}&select=role,events(id,slug,title,date,location,city,status,deleted_at)`
    )) ?? [];
  return rows
    .map((row) => ({ role: row.role, ...(row.events || {}) }))
    .filter((e) => e.id && e.status === "PUBLISHED" && !e.deleted_at)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
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
    "id,slug,title,description,image_url,date,time,location,city,address,country_code,currency,price,is_permanent,status,ticket_types(id,name,price,available)";
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key
    );
  const filter = isUuid ? `id=eq.${key}` : `slug=eq.${encodeEq(key)}`;
  const rows = await supabaseGet(`events?${filter}&select=${select}`);
  return rows?.[0] ?? null;
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

async function fetchBySlug(table: string, slug: string, select: string) {
  const rows = await supabaseGet(
    `${table}?slug=eq.${encodeEq(slug)}&select=${select}&limit=1`
  );
  return rows?.[0] ?? null;
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
  const image = escapeHtml(opts.image || "https://tembas.com/temba-wordmark-dark.jpg");
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
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Temba" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
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

function generateEventHtml(
  event: any,
  requestParam: string,
  related: any[],
  performers: { name: string; slug?: string; role?: string }[] = []
): string {
  const title = event?.title || "Événement Temba";
  const rawDesc = stripHtml(event?.description);
  const location = event?.city || event?.location || "";
  const eventDate = event?.is_permanent ? "Ouvert toute l'année" : formatFrDate(event?.date);
  const eventTime = event?.time || "";
  const description =
    rawDesc ||
    `Achetez vos billets pour ${title}${location ? ` à ${location}` : ""} sur Temba.`;
  const eventUrl = `https://tembas.com${
    event ? eventPublicPath(event) : `/e/${requestParam}`
  }`;
  const imageUrl = event?.image_url || "https://tembas.com/temba-wordmark-dark.jpg";
  const currency = event?.currency || "XOF";
  const tickets: any[] = event?.ticket_types || [];
  const minPrice =
    tickets.length > 0
      ? Math.min(...tickets.map((t) => Number(t.price) || 0))
      : Number(event?.price) || 0;

  const startDate = event?.is_permanent
    ? undefined
    : event?.date
      ? event.time
        ? `${event.date}T${event.time}`
        : event.date
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description,
    url: eventUrl,
    image: [imageUrl],
    ...(startDate ? { startDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event?.location || location || "Afrique de l'Ouest",
      address: {
        "@type": "PostalAddress",
        streetAddress: event?.address || event?.location || undefined,
        addressLocality: event?.city || event?.location || undefined,
        addressCountry: event?.country_code || "BF",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Temba",
      url: "https://tembas.com/",
    },
    performer: performers.length
      ? performers.map((a) => ({
          "@type": "Person",
          "@id": a.slug ? `https://tembas.com/artists/${a.slug}` : undefined,
          name: a.name,
          url: a.slug ? `https://tembas.com/artists/${a.slug}` : undefined,
        }))
      : undefined,
    offers: (tickets.length ? tickets : [{ price: minPrice, available: 1 }]).map((t) => ({
      "@type": "Offer",
      url: eventUrl,
      name: t.name || "Billet",
      price: t.price ?? minPrice,
      priceCurrency: currency,
      availability:
        t.available === 0
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
    })),
  };

  const ticketLines = tickets
    .map(
      (t) =>
        `<li>${escapeHtml(t.name || "Billet")} — ${escapeHtml(t.price)} ${escapeHtml(currency)}</li>`
    )
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
    <p>${escapeHtml(description)}</p>
    ${artistLines ? `<h2>À l'affiche</h2><ul>${artistLines}</ul>` : ""}
    ${ticketLines ? `<h2>Tarifs</h2><ul>${ticketLines}</ul>` : ""}
    <p><a href="${escapeHtml(eventUrl)}">Acheter des billets sur Temba</a></p>
    ${event?.image_url ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />` : ""}
  </article>
  <h2>Autres événements</h2>
  ${eventListHtml(related.filter((e) => e.id !== event?.id).slice(0, 12))}
  `;

  return layout({
    title,
    description,
    url: eventUrl,
    image: imageUrl,
    ogType: "event",
    jsonLd,
    body,
  });
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
    image: "https://tembas.com/temba-mark-navy.jpg",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Temba",
        url: "https://tembas.com/",
        logo: "https://tembas.com/temba-mark-navy.jpg",
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
        name: "Temba",
        url: "https://tembas.com/",
        inLanguage: "fr-BF",
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
    body: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>
      <p>Code : <strong>${escapeHtml(referralCode)}</strong></p>
      <p><a href="https://tembas.com/ref/${escapeHtml(referralCode)}">Rejoindre Temba</a></p>`,
  });
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

  const eventMatch = url.pathname.match(/^\/(e|events)\/([^/]+)$/);
  if (eventMatch) {
    const requestParam = decodeURIComponent(eventMatch[2]);
    const [event, related] = await Promise.all([
      fetchEvent(requestParam),
      fetchPublishedEvents(12),
    ]);
    if (event) {
      const canonical = eventPublicPath(event);
      if (url.pathname !== canonical) {
        return Response.redirect(`https://tembas.com${canonical}`, 301);
      }
      const performers = await fetchEventPerformers(event.id);
      return new Response(generateEventHtml(event, requestParam, related, performers), {
        headers: htmlHeaders,
      });
    }
    return new Response(generateEventHtml(event, requestParam, related), {
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
    const venues =
      (await supabaseGet(
        "venues?select=slug,name,city,updated_at&slug=not.is.null&order=name.asc&limit=40"
      )) ?? [];
    return new Response(
      generateCollectionHtml({
        title: "Lieux — Salles et sites",
        description: "Découvrez les salles et sites partenaires de Temba au Burkina Faso et en Afrique de l'Ouest.",
        url: "https://tembas.com/venues",
        items: venues
          .filter((v) => v.slug)
          .map((v) => ({
            href: `https://tembas.com/venues/${v.slug}`,
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
    const venue = await fetchBySlug(
      "venues",
      slug,
      "slug,name,description,city,address,photos"
    );
    const name = venue?.name || slug;
    const photo = Array.isArray(venue?.photos) ? venue.photos[0] : undefined;
    return new Response(
      generateCollectionHtml({
        title: name,
        description:
          stripHtml(venue?.description) ||
          `Événements à ${name}${venue?.city ? ` (${venue.city})` : ""} sur Temba.`,
        url: `https://tembas.com/venues/${slug}`,
        image: photo,
        items: [
          { href: "https://tembas.com/venues", name: "Tous les lieux" },
          { href: "https://tembas.com/events", name: "Agenda Temba" },
        ],
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Place",
          name,
          url: `https://tembas.com/venues/${slug}`,
          address: venue?.city
            ? { "@type": "PostalAddress", addressLocality: venue.city }
            : undefined,
        },
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
    if (!artist) {
      return new Response(
        layout({
          title: "Artiste introuvable",
          description: "Cette fiche artiste n’existe pas sur Temba.",
          url: `https://tembas.com/artists/${slug}`,
          robots: "noindex, follow",
          body: `<h1>Artiste introuvable</h1><p>Cette fiche n’existe pas, ou le lien a changé.</p><p><a href="https://tembas.com/artists">Tous les artistes</a></p>`,
        }),
        { status: 404, headers: htmlHeaders }
      );
    }
    const name = artist.name || slug;
    const pageUrl = `https://tembas.com/artists/${artist.slug || slug}`;
    const shows = artist.id ? await fetchArtistPublishedShows(artist.id) : [];
    const next = shows.find((s) => s.date) || shows[0];
    const description = next?.title
      ? clampMeta(
          `${name}${artist.genre ? ` (${artist.genre})` : ""} : « ${next.title} »${
            next.date ? ` le ${formatFrDate(next.date)}` : ""
          }${next.location || next.city ? ` à ${next.city || next.location}` : ""}. Billets officiels sur Temba.`
        )
      : clampMeta(
          stripHtml(artist.bio) ||
            `Fiche officielle de ${name}${artist.genre ? `, ${artist.genre}` : ""} sur Temba. Dates publiées et billets en FCFA.`
        );
    const sameAs = artistSameAs(artist.social_links);
    const jsonLd = [
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
              startDate: s.date || undefined,
              location: {
                "@type": "Place",
                name: s.city || s.location || "Afrique de l'Ouest",
              },
            }))
          : undefined,
      },
    ];
    const place = artist.city || next?.city || "Ouagadougou";
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
          name: `${name} en concert à ${place} ?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: next?.title
              ? `Oui : « ${next.title} »${next.date ? ` le ${formatFrDate(next.date)}` : ""}. Billets sur Temba.`
              : `${name} n’a pas encore de date publiée sur Temba.`,
          },
        },
      ],
    });
    const showItems = shows.map((s) => ({
      href: `https://tembas.com${eventPublicPath(s)}`,
      name: s.title,
      extra: [formatFrDate(s.date), s.city || s.location].filter(Boolean).join(" · "),
    }));
    const bio = stripHtml(artist.bio);
    const body = `<article>
      <nav><a href="https://tembas.com/artists">Artistes</a> / ${escapeHtml(name)}</nav>
      <h1>${escapeHtml(name)}</h1>
      ${artist.genre ? `<p>${escapeHtml(artist.genre)}${artist.city ? ` · ${escapeHtml(artist.city)}` : ""}</p>` : ""}
      ${bio ? `<p>${escapeHtml(bio)}</p>` : ""}
      <p>Fiche officielle Temba : seuls les concerts réellement mis en vente sur la plateforme sont listés.</p>
      ${artist.photo_url ? `<img src="${escapeHtml(artist.photo_url)}" alt="${escapeHtml(name)}, artiste" />` : ""}
      <h2>Concerts et billets ${escapeHtml(name)}</h2>
      ${showItems.length ? linkList(showItems) : "<p>Pas encore de date publiée sur Temba.</p>"}
      <h2>Où acheter des billets pour ${escapeHtml(name)} ?</h2>
      <p>Sur Temba. Orange Money, Moov Money ou carte — QR sur le téléphone.</p>
    </article>`;
    const placeTitle = artist.city || next?.city || next?.location || "";
    const seoTitle = placeTitle
      ? `${name} — concert à ${/bobo/i.test(placeTitle) ? "Bobo-Dioulasso" : /ouaga/i.test(placeTitle) ? "Ouagadougou" : placeTitle}, billets`
      : `${name} — concert et billets`;
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
      (await supabaseGet("categories?select=id,slug,name,description&order=name.asc&limit=40")) ??
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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key
      );
    let rows = await supabaseGet(
      isUuid
        ? `categories?id=eq.${key}&select=id,slug,name,description&limit=1`
        : `categories?slug=eq.${encodeEq(key)}&select=id,slug,name,description&limit=1`
    );
    if (!rows?.[0] && !isUuid) {
      const alias =
        key === "concerts-de-musique"
          ? "music-concerts"
          : key === "sport"
          ? "sports"
          : key === "music-concerts"
          ? "concerts-de-musique"
          : key === "sports"
          ? "sport"
          : "";
      if (alias) {
        rows = await supabaseGet(
          `categories?slug=eq.${encodeEq(alias)}&select=id,slug,name,description&limit=1`
        );
      }
      if (!rows?.[0]) {
        const nameGuess = key.replace(/-/g, " ");
        rows = await supabaseGet(
          `categories?name=ilike.${encodeEq(nameGuess)}&select=id,slug,name,description&limit=1`
        );
      }
      if (!rows?.[0] && (key === "concerts-de-musique" || key === "music-concerts")) {
        rows = await supabaseGet(
          `categories?name=ilike.${encodeEq("Music Concerts")}&select=id,slug,name,description&limit=1`
        );
      }
    }
    const category = rows?.[0];
    const publicSlug = frenchCategorySlug(category, key);
    if (category && key !== publicSlug) {
      return Response.redirect(`https://tembas.com/categories/${publicSlug}`, 301);
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
      "slug,title,excerpt,content,featured_image,featured_image_url,meta_title,meta_description,status"
    );
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
        image: post?.featured_image || post?.featured_image_url,
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
    const tag = await fetchBySlug("tags", slug, "slug,name,description");
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

  const citySlug = url.pathname.replace(/^\/+|\/+$/g, "");
  const cityPage = CITY_PAGES[citySlug];
  if (cityPage) {
    const [dated, permanents] = await Promise.all([
      fetchPublishedEvents(80),
      supabaseGet(
        "events?select=id,slug,title,date,location,city,image_url,is_permanent,price,currency,country_code&status=eq.PUBLISHED&deleted_at=is.null&is_permanent=eq.true&limit=40"
      ),
    ]);
    const merged = [...(dated ?? []), ...(permanents ?? [])];
    const seen = new Set<string>();
    const events = merged.filter((e) => {
      if (!e?.id || seen.has(e.id)) return false;
      seen.add(e.id);
      return eventMatchesCityPage(e, citySlug, cityPage);
    });
    return new Response(
      generateCollectionHtml({
        title: cityPage.title,
        description: cityPage.description,
        url: `https://tembas.com/${citySlug}`,
        items: [
          {
            href: "https://tembas.com/artists",
            name: `Artistes et concerts à ${cityPage.name}`,
          },
          ...events.map((e) => ({
            href: `https://tembas.com${eventPublicPath(e)}`,
            name: e.title,
            extra: e.city || e.location || "",
          })),
        ],
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
  ],
};
