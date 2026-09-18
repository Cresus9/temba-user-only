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

async function fetchPublishedEvents(limit = 30) {
  return (
    (await supabaseGet(
      `events?select=id,slug,title,date,location,city,image_url,is_permanent,price,currency&status=eq.PUBLISHED&deleted_at=is.null&order=date.asc.nullslast&limit=${limit}`
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
  <meta name="robots" content="index, follow" />
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

function generateEventHtml(event: any, requestParam: string, related: any[]): string {
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

  const body = `
  <article>
    <h1>${escapeHtml(title)}</h1>
    ${eventDate ? `<p>Date : ${escapeHtml(eventDate)}${eventTime ? ` à ${escapeHtml(eventTime)}` : ""}</p>` : ""}
    ${location ? `<p>Lieu : ${escapeHtml(location)}</p>` : ""}
    <p>${escapeHtml(description)}</p>
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
    body: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${eventListHtml(events)}`,
  });
}

function generateHomeHtml(events: any[]): string {
  const title = "Temba – N°1 Billetterie Burkina Faso | Concerts, Festivals & Événements";
  const description =
    "Achetez vos billets en ligne pour les concerts, festivals et événements à Ouagadougou et partout au Burkina Faso. Paiement sécurisé en FCFA.";
  return layout({
    title,
    description,
    url: "https://tembas.com/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Temba",
      url: "https://tembas.com/",
      logo: "https://tembas.com/temba-wordmark-dark.jpg",
    },
    body: `<h1>Temba — Billetterie en ligne</h1>
      <p>${escapeHtml(description)}</p>
      <h2>Événements à l'affiche</h2>
      ${eventListHtml(events)}`,
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
    const events = await fetchPublishedEvents(20);
    return new Response(generateHomeHtml(events), { headers: htmlHeaders });
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
        "artists?select=slug,name,genre,city&slug=not.is.null&order=name.asc&limit=40"
      )) ?? [];
    return new Response(
      generateCollectionHtml({
        title: "Artistes",
        description: "Artistes programmés sur Temba : concerts et festivals en Afrique de l'Ouest.",
        url: "https://tembas.com/artists",
        items: artists
          .filter((a) => a.slug)
          .map((a) => ({
            href: `https://tembas.com/artists/${a.slug}`,
            name: a.name,
            extra: [a.genre, a.city].filter(Boolean).join(" · "),
          })),
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
      "slug,name,bio,photo_url,cover_image_url,genre,city"
    );
    const name = artist?.name || slug;
    return new Response(
      generateCollectionHtml({
        title: name,
        description:
          stripHtml(artist?.bio) ||
          `Dates de ${name}${artist?.genre ? ` (${artist.genre})` : ""} sur Temba.`,
        url: `https://tembas.com/artists/${slug}`,
        image: artist?.cover_image_url || artist?.photo_url,
        items: [
          { href: "https://tembas.com/artists", name: "Tous les artistes" },
          { href: "https://tembas.com/events", name: "Agenda Temba" },
        ],
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Person",
          name,
          url: `https://tembas.com/artists/${slug}`,
        },
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
        items: categories.map((c) => ({
          href: `https://tembas.com/categories/${c.slug || c.id}`,
          name: c.name,
          extra: stripHtml(c.description).slice(0, 80),
        })),
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
    const rows = await supabaseGet(
      isUuid
        ? `categories?id=eq.${key}&select=id,slug,name,description&limit=1`
        : `categories?slug=eq.${encodeEq(key)}&select=id,slug,name,description&limit=1`
    );
    const category = rows?.[0];
    const name = category?.name || key;
    return new Response(
      generateCollectionHtml({
        title: name,
        description:
          stripHtml(category?.description) ||
          `Événements ${name} au Burkina Faso — billets sur Temba.`,
        url: `https://tembas.com/categories/${key}`,
        items: [
          { href: "https://tembas.com/categories", name: "Toutes les catégories" },
          { href: "https://tembas.com/events", name: "Agenda Temba" },
        ],
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
  ],
};
