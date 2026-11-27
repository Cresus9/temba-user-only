/**
 * SEO titles and artist show lists shared by the SPA and the crawler HTML in
 * og-tags. Plain TypeScript: no Deno, Node or DOM APIs. Calendar days are
 * parsed from "YYYY-MM-DD" by hand (never new Date('YYYY-MM-DD')).
 */

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function ymdParts(value?: string | null): [number, number, number] | null {
  const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return [y, mo, d];
}

/** "26 décembre 2026" (1er for the first day). */
export function frDay(value?: string | null, withYear = true): string {
  const p = ymdParts(value);
  if (!p) return "";
  const day = p[2] === 1 ? "1er" : String(p[2]);
  return `${day} ${MONTHS_FR[p[1] - 1]}${withYear ? ` ${p[0]}` : ""}`;
}

/** "26 décembre 2026", "19 au 20 décembre 2026", "30 décembre 2026 au 2 janvier 2027". */
export function frDayRange(first?: string | null, last?: string | null): string {
  const a = ymdParts(first);
  const b = ymdParts(last);
  if (!a) return "";
  if (!b || (a[0] === b[0] && a[1] === b[1] && a[2] === b[2])) return frDay(first);
  if (a[0] === b[0] && a[1] === b[1]) return `${a[2] === 1 ? "1er" : a[2]} au ${frDay(last)}`;
  if (a[0] === b[0]) return `${frDay(first, false)} au ${frDay(last)}`;
  return `${frDay(first)} au ${frDay(last)}`;
}

function fold(value?: string | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Display city for titles: the event's city, else a known city in the location. */
export function seoCity(city?: string | null, location?: string | null): string {
  const c = String(city ?? "").trim();
  const hay = fold(`${c} ${location ?? ""}`);
  if (/\bbobo\b/.test(hay)) return "Bobo-Dioulasso";
  if (/\bouaga/.test(hay)) return "Ouagadougou";
  if (/\babidjan\b/.test(hay)) return "Abidjan";
  if (/\bdakar\b/.test(hay)) return "Dakar";
  return c;
}

function titleHasCity(title: string, city: string): boolean {
  const t = fold(title);
  const c = fold(city);
  if (!c) return true;
  if (t.includes(c)) return true;
  if (c === "ouagadougou" && /\bouaga\b/.test(t)) return true;
  if (c === "bobo-dioulasso" && /\bbobo\b/.test(t)) return true;
  return false;
}

export type SeoEventInput = {
  title?: string | null;
  city?: string | null;
  location?: string | null;
  date?: string | null;
  is_permanent?: boolean | null;
};

export type SeoDateRow = { date?: string | null; status?: string | null };

/** First and last active calendar day of an event (event_dates first, then events.date). */
export function eventDaySpan(event: SeoEventInput, dates?: SeoDateRow[] | null): { first: string | null; last: string | null } {
  const days = (dates ?? [])
    .filter((d) => ymdParts(d.date) && (!d.status || String(d.status).toLowerCase() === "active"))
    .map((d) => String(d.date).slice(0, 10))
    .sort();
  if (days.length) return { first: days[0], last: days[days.length - 1] };
  const own = ymdParts(event.date) ? String(event.date).slice(0, 10) : null;
  return { first: own, last: own };
}

const MAX_TITLE = 70;

/**
 * "Alif Naaba — Ouagadougou, 26 décembre 2026". City is skipped when the title
 * already names it. Long titles are cut at their first " – " / " - " / "(".
 * Permanent attractions: "Banco National Zoo à Abidjan — billets".
 */
export function eventSeoTitle(event: SeoEventInput, dates?: SeoDateRow[] | null): string {
  let base = String(event.title ?? "").replace(/\s+/g, " ").trim().replace(/[\s–—-]+$/, "");
  if (!base) base = "Événement";
  const city = seoCity(event.city, event.location);
  const cityPart = city && !titleHasCity(base, city) ? city : "";

  if (event.is_permanent) {
    return `${base}${cityPart ? ` à ${cityPart}` : ""} — billets`;
  }

  const span = eventDaySpan(event, dates);
  const when = span.first ? frDayRange(span.first, span.last) : "";
  const suffix = [cityPart, when].filter(Boolean).join(", ");
  if (!suffix) return base;

  let full = `${base} — ${suffix}`;
  if (full.length > MAX_TITLE) {
    const cut = base.split(/\s[–—-]\s|\s\(/)[0].trim();
    if (cut.length >= 6 && cut.length < base.length) full = `${cut} — ${suffix}`;
  }
  return full;
}

/* ------------------------------------------------------------------ artists */

export type ArtistShowInput = {
  id: string;
  date?: string | null;
  is_permanent?: boolean | null;
  event_dates?: SeoDateRow[] | null;
  [key: string]: unknown;
};

/**
 * Splits an artist's shows into upcoming (soonest first) and past (latest
 * first). A show is upcoming while its last day is today or later, in the
 * Ouagadougou calendar day passed as `today` ("YYYY-MM-DD").
 */
export function splitArtistShows<T extends ArtistShowInput>(shows: T[], today: string): {
  upcoming: (T & { first: string | null; last: string | null })[];
  past: (T & { first: string | null; last: string | null })[];
} {
  const rows = shows.map((s) => ({ ...s, ...eventDaySpan(s, s.event_dates ?? null) }));
  const upcoming = rows
    .filter((s) => s.is_permanent || (s.last !== null && s.last >= today))
    .sort((a, b) => String(a.first ?? "9999").localeCompare(String(b.first ?? "9999")));
  const past = rows
    .filter((s) => !s.is_permanent && !(s.last !== null && s.last >= today))
    .sort((a, b) => String(b.last ?? "").localeCompare(String(a.last ?? "")));
  return { upcoming, past };
}

/** Artist page title. "concert à …" only when a real upcoming show exists. */
export function artistPageTitle(name: string, next?: { city?: string | null; location?: string | null } | null): string {
  if (!next) return `${name} — artiste, dates et billets`;
  const place = seoCity(next.city, next.location);
  return place ? `${name} — concert à ${place}, billets` : `${name} — concert et billets`;
}
