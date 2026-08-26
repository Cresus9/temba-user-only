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
];

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((c) => ua.includes(c));
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

async function fetchEvent(eventId: string) {
  const rows = await supabaseGet(
    `events?id=eq.${eventId}&select=id,title,description,image_url,date,time,location,city,address,country_code,currency,price,is_permanent,status,ticket_types(id,name,price,available)`
  );
  return rows?.[0] ?? null;
}

async function fetchPublishedEvents(limit = 30) {
  return (
    (await supabaseGet(
      `events?select=id,title,date,location,city,image_url,is_permanent,price,currency&status=eq.PUBLISHED&deleted_at=is.null&order=date.asc.nullslast&limit=${limit}`
    )) ?? []
  );
}

function formatFrDate(date?: string | null): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function layout(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  body: string;
}): string {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description.slice(0, 220));
  const url = escapeHtml(opts.url);
  const image = escapeHtml(opts.image || "https://tembas.com/temba-wordmark-dark.jpg");
  const jsonLd = opts.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Temba</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
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
      return `<li><a href="https://tembas.com/events/${e.id}">${escapeHtml(e.title)}</a>${
        date || place ? ` — ${escapeHtml([date, place].filter(Boolean).join(" · "))}` : ""
      }</li>`;
    })
    .join("")}</ul>`;
}

function generateEventHtml(event: any, eventId: string, related: any[]): string {
  const title = event?.title || "Événement Temba";
  const rawDesc = stripHtml(event?.description);
  const location = event?.city || event?.location || "";
  const eventDate = event?.is_permanent ? "Ouvert toute l'année" : formatFrDate(event?.date);
  const eventTime = event?.time || "";
  const description =
    rawDesc ||
    `Achetez vos billets pour ${title}${location ? ` à ${location}` : ""} sur Temba.`;
  const eventUrl = `https://tembas.com/events/${eventId}`;
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
  ${eventListHtml(related.filter((e) => e.id !== eventId).slice(0, 12))}
  `;

  return layout({ title, description, url: eventUrl, image: imageUrl, jsonLd, body });
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
        url: `https://tembas.com/events/${e.id}`,
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

  const eventMatch = url.pathname.match(/^\/events\/([^/]+)$/);
  if (eventMatch) {
    const eventId = eventMatch[1];
    const [event, related] = await Promise.all([
      fetchEvent(eventId),
      fetchPublishedEvents(12),
    ]);
    return new Response(generateEventHtml(event, eventId, related), {
      headers: htmlHeaders,
    });
  }

  const refMatch = url.pathname.match(/^\/ref\/([^/]+)$/);
  if (refMatch) {
    return new Response(generateReferralHtml(refMatch[1]), { headers: htmlHeaders });
  }

  return context.next();
}

export const config = {
  path: ["/", "/events", "/events/*", "/ref/*"],
};
