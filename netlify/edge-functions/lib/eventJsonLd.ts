/**
 * schema.org Event JSON-LD shared by the SPA (EventDetails) and the crawler
 * HTML in og-tags. Plain TypeScript: no Deno, Node or DOM APIs.
 *
 * Rules (Temba):
 * - A price of 0, or no price, is NOT free. Such tickets get no Offer at all,
 *   and the event gets no `offers` block when no ticket has a real price.
 * - Only real database fields. Nothing is guessed.
 * - Dates carry the event's UTC offset (Africa/Ouagadougou is +00:00).
 */

export type JsonLdTicket = {
  name?: string | null;
  price?: number | string | null;
  available?: number | null;
  sales_enabled?: boolean | null;
};

export type JsonLdDate = {
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
};

export type JsonLdEventInput = {
  id: string;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  currency?: string | null;
  price?: number | string | null;
  is_permanent?: boolean | null;
  status?: string | null;
  ticket_types?: JsonLdTicket[] | null;
};

export type JsonLdExtras = {
  /** Absolute event URL (canonical). */
  url: string;
  /** Absolute flyer URL; omitted when the event has no image. */
  image?: string | null;
  /** Real organizer (organizer_profiles.business_name). */
  organizer?: { name: string; url?: string | null } | null;
  /** Venue row linked by events.venue_id. */
  venue?: { name?: string | null; address?: string | null; city?: string | null } | null;
  performers?: { name: string; slug?: string | null }[];
  dates?: JsonLdDate[];
};

const GMT_ZONES = new Set([
  "Africa/Ouagadougou",
  "Africa/Abidjan",
  "Africa/Dakar",
  "Africa/Bamako",
  "Africa/Lome",
  "Africa/Conakry",
  "Africa/Accra",
  "Africa/Banjul",
  "Africa/Freetown",
  "Africa/Monrovia",
  "Africa/Nouakchott",
  "Africa/Bissau",
  "UTC",
  "Etc/UTC",
  "GMT",
]);

export function stripTags(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** "+00:00" style offset of `timeZone` on a given calendar day. */
export function utcOffsetFor(timeZone: string | null | undefined, ymd: string): string | null {
  const zone = (timeZone || "Africa/Ouagadougou").trim();
  if (GMT_ZONES.has(zone)) return "+00:00";
  try {
    const at = new Date(`${ymd}T12:00:00Z`);
    if (Number.isNaN(at.getTime())) return null;
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    if (!part) return null;
    if (part === "GMT") return "+00:00";
    const m = part.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!m) return null;
    return `${m[1]}${m[2].padStart(2, "0")}:${m[3] ?? "00"}`;
  } catch {
    return null;
  }
}

function ymdOf(value?: string | null): string | null {
  const m = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function hms(value?: string | null): string | null {
  const m = String(value ?? "").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

function addDay(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/** ISO 8601 with offset when there is a time; plain date otherwise. */
export function isoLocal(ymd: string | null, time: string | null, timeZone?: string | null): string | undefined {
  if (!ymd) return undefined;
  const t = hms(time);
  if (!t) return ymd;
  const offset = utcOffsetFor(timeZone, ymd);
  return offset ? `${ymd}T${t}${offset}` : `${ymd}T${t}`;
}

export function realPrice(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/\s/g, "")) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "1 000 F CFA" (narrow no-break spaces avoided for plain HTML). */
export function formatFcfa(amount: number): string {
  const rounded = Math.round(amount);
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} F CFA`;
}

function offerAvailability(t: JsonLdTicket): string | undefined {
  if (t.sales_enabled === false) return undefined;
  if (t.available === 0) return "https://schema.org/SoldOut";
  return "https://schema.org/InStock";
}

export function buildEventJsonLd(event: JsonLdEventInput, extras: JsonLdExtras): Record<string, unknown> {
  const tz = event.timezone || "Africa/Ouagadougou";
  const activeDates = (extras.dates ?? [])
    .filter((d) => ymdOf(d.date) && (!d.status || d.status.toLowerCase() === "active"))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const first = activeDates[0];
  const last = activeDates[activeDates.length - 1];

  let startDate: string | undefined;
  let endDate: string | undefined;
  if (!event.is_permanent) {
    const startYmd = ymdOf(first?.date) ?? ymdOf(event.date);
    const startTime = first?.start_time || event.time || null;
    startDate = isoLocal(startYmd, startTime, tz);
    if (last && ymdOf(last.date)) {
      const lastYmd = ymdOf(last.date) as string;
      const end = hms(last.end_time);
      const lastStart = hms(last.start_time || startTime);
      if (end) {
        const endYmd = lastStart && end <= lastStart ? addDay(lastYmd) : lastYmd;
        endDate = isoLocal(endYmd, end, tz);
      } else if (activeDates.length > 1) {
        endDate = lastYmd;
      }
    }
  }

  const currency = (event.currency || "XOF").toUpperCase();
  const tickets = (event.ticket_types ?? []).filter((t) => realPrice(t.price) !== null);
  const offers = tickets.length
    ? tickets.map((t) => {
        const availability = offerAvailability(t);
        return {
          "@type": "Offer",
          url: extras.url,
          name: String(t.name ?? "").trim() || undefined,
          price: realPrice(t.price),
          priceCurrency: currency,
          ...(availability ? { availability } : {}),
        };
      })
    : (event.ticket_types ?? []).length === 0 && realPrice(event.price) !== null
      ? [
          {
            "@type": "Offer",
            url: extras.url,
            price: realPrice(event.price),
            priceCurrency: currency,
          },
        ]
      : undefined;

  const venueName = String(extras.venue?.name || event.location || "").trim();
  const street = String(event.address || extras.venue?.address || "").trim();
  const city = String(event.city || extras.venue?.city || "").trim();
  const description = stripTags(event.description);

  const performers = (extras.performers ?? []).filter((p) => p.name);

  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: String(event.title ?? "").trim(),
    url: extras.url,
    ...(description ? { description } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(extras.image ? { image: [extras.image] } : {}),
    location: {
      "@type": "Place",
      name: venueName || city || undefined,
      address: {
        "@type": "PostalAddress",
        ...(street && street !== venueName ? { streetAddress: street } : {}),
        ...(city ? { addressLocality: city } : {}),
        ...(event.region ? { addressRegion: event.region } : {}),
        addressCountry: (event.country_code || "BF").toUpperCase(),
      },
    },
    ...(extras.organizer?.name
      ? {
          organizer: {
            "@type": "Organization",
            name: extras.organizer.name.trim(),
            ...(extras.organizer.url ? { url: extras.organizer.url } : {}),
          },
        }
      : {}),
    ...(performers.length
      ? {
          performer: performers.map((a) => ({
            "@type": "Person",
            ...(a.slug ? { "@id": `https://tembas.com/artists/${a.slug}` } : {}),
            name: a.name,
            ...(a.slug ? { url: `https://tembas.com/artists/${a.slug}` } : {}),
          })),
        }
      : {}),
    ...(offers ? { offers } : {}),
  };
  return out;
}
