/**
 * eventGeo.ts — Geo & timezone utilities for Temba events.
 *
 * All helpers are pure functions so they work identically in the browser,
 * Supabase Edge Functions, and any future server-side rendering.
 *
 * Key principle: the browser's Intl API handles all timezone arithmetic.
 * No third-party tz library is needed — the IANA database is built into
 * every modern browser and Node.js ≥ 13.
 */

// ── Country metadata ──────────────────────────────────────────────────────

export interface CountryMeta {
  code: string;          // ISO 3166-1 alpha-2
  name: string;          // English display name
  nameFr: string;        // French display name
  flag: string;          // Emoji flag
  defaultTimezone: string; // IANA tz for the country's main city
  currency: string;      // ISO 4217 default currency
}

/** Supported countries for event listing — extend as you expand. */
export const SUPPORTED_COUNTRIES: CountryMeta[] = [
  {
    code: 'BF',
    name: 'Burkina Faso',
    nameFr: 'Burkina Faso',
    flag: '🇧🇫',
    defaultTimezone: 'Africa/Ouagadougou',
    currency: 'XOF',
  },
  {
    code: 'SN',
    name: 'Senegal',
    nameFr: 'Sénégal',
    flag: '🇸🇳',
    defaultTimezone: 'Africa/Dakar',
    currency: 'XOF',
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    nameFr: "Côte d'Ivoire",
    flag: '🇨🇮',
    defaultTimezone: 'Africa/Abidjan',
    currency: 'XOF',
  },
  {
    code: 'ML',
    name: 'Mali',
    nameFr: 'Mali',
    flag: '🇲🇱',
    defaultTimezone: 'Africa/Bamako',
    currency: 'XOF',
  },
  {
    code: 'FR',
    name: 'France',
    nameFr: 'France',
    flag: '🇫🇷',
    defaultTimezone: 'Europe/Paris',
    currency: 'EUR',
  },
  {
    code: 'BE',
    name: 'Belgium',
    nameFr: 'Belgique',
    flag: '🇧🇪',
    defaultTimezone: 'Europe/Brussels',
    currency: 'EUR',
  },
  {
    code: 'US',
    name: 'United States',
    nameFr: 'États-Unis',
    flag: '🇺🇸',
    defaultTimezone: 'America/New_York',
    currency: 'USD',
  },
  {
    code: 'CA',
    name: 'Canada',
    nameFr: 'Canada',
    flag: '🇨🇦',
    defaultTimezone: 'America/Toronto',
    currency: 'CAD',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    nameFr: 'Royaume-Uni',
    flag: '🇬🇧',
    defaultTimezone: 'Europe/London',
    currency: 'GBP',
  },
];

/** Quick lookup by country code. */
const COUNTRY_MAP = new Map<string, CountryMeta>(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c])
);

export function getCountryMeta(code: string): CountryMeta | undefined {
  return COUNTRY_MAP.get(code?.toUpperCase());
}

/**
 * Returns the emoji flag for a country code.
 * Falls back to 🌍 for unknown codes.
 */
export function countryFlag(code?: string): string {
  if (!code) return '🌍';
  return COUNTRY_MAP.get(code.toUpperCase())?.flag ?? '🌍';
}

/**
 * Returns the French display name for a country code.
 * Falls back to the raw code.
 */
export function countryNameFr(code?: string): string {
  if (!code) return '';
  return COUNTRY_MAP.get(code.toUpperCase())?.nameFr ?? code;
}

/**
 * Returns true when the event is outside Burkina Faso — used to decide
 * whether to show the country badge on cards.
 */
export function isAbroadEvent(countryCode?: string): boolean {
  return !!countryCode && countryCode.toUpperCase() !== 'BF';
}

// ── Timezone-aware date formatting ────────────────────────────────────────

/**
 * Formats an event date string in the event's own timezone so that a Paris
 * buyer and an Ouaga buyer both see "20:00, heure de Paris" rather than a
 * browser-local time that may be wrong.
 *
 * @param isoDate  — date string from the DB (e.g. "2026-07-15")
 * @param time     — time string from the DB (e.g. "20:00:00" or "20:00")
 * @param timezone — IANA tz (e.g. "Europe/Paris")
 * @param locale   — display locale (default "fr-FR")
 */
export function formatEventDateTime(
  isoDate: string,
  time: string,
  timezone: string = 'Africa/Ouagadougou',
  locale: string = 'fr-FR'
): {
  date: string;       // e.g. "samedi 15 juillet 2026"
  time: string;       // e.g. "20:00"
  tzLabel: string;    // e.g. "heure de Paris"
  isoFull: string;    // e.g. "2026-07-15T20:00:00"
} {
  // Build a wall-clock datetime string and interpret it in the event timezone.
  const timePart = time?.slice(0, 5) ?? '00:00'; // normalize to HH:MM
  const isoFull = `${isoDate}T${timePart}:00`;

  const dtf = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Build a Date that represents the exact wall-clock moment in the tz.
  // We treat the DB values as "local time in the event timezone".
  const asUtc = new Date(`${isoDate}T${timePart}:00Z`);

  const offsetMs = getTimezoneOffsetMs(timezone, asUtc);
  const localMs = asUtc.getTime() - offsetMs;
  const localDate = new Date(localMs);

  const tzLabel = formatTzLabel(timezone, locale);

  return {
    date: dtf.format(localDate),
    time: timeFmt.format(localDate),
    tzLabel,
    isoFull,
  };
}

/**
 * Short date label for cards — "15 juil." in the event timezone.
 */
export function shortDateLabel(
  isoDate: string,
  timezone: string = 'Africa/Ouagadougou',
  locale: string = 'fr-FR'
): string {
  const dtf = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
  });
  // Interpret as noon UTC to avoid date-boundary edge cases when tz offsets differ.
  return dtf.format(new Date(`${isoDate}T12:00:00Z`));
}

/**
 * Returns a human-readable timezone label.
 * e.g. "heure de Paris" or "Eastern Time (US)"
 */
function formatTzLabel(timezone: string, locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      timeZoneName: 'long',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}

/**
 * Returns the timezone offset (ms) for a given IANA tz at a specific Date.
 * Positive = behind UTC, negative = ahead of UTC (standard JS convention inverted).
 */
function getTimezoneOffsetMs(timezone: string, date: Date): number {
  // Trick: format the date in UTC and in the target tz, compute the difference.
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  return new Date(utcStr).getTime() - new Date(tzStr).getTime();
}

// ── Location display helpers ──────────────────────────────────────────────

/**
 * Returns a compact location label for the event card.
 * - Same country as viewer (BF):  just show `location` field as-is
 * - Abroad:  "Paris · 🇫🇷"
 */
export function eventLocationLabel(event: {
  location: string;
  city?: string;
  country_code?: string;
}): { primary: string; badge: string | null } {
  const abroad = isAbroadEvent(event.country_code);
  if (!abroad) {
    return { primary: event.location, badge: null };
  }
  const flag = countryFlag(event.country_code);
  const city = event.city ?? event.location;
  return {
    primary: city,
    badge: flag,
  };
}

/**
 * Sorts an array of events so that events from `priorityCountry` come first
 * (ordered by date), followed by all other events (also by date).
 * When `priorityCountry` is null/undefined the original date order is preserved.
 */
export function sortEventsByCountryPriority<T extends { date: string; country_code?: string }>(
  events: T[],
  priorityCountry: string | null | undefined
): T[] {
  if (!priorityCountry) return events;
  return [...events].sort((a, b) => {
    const aHome = (a.country_code ?? 'BF') === priorityCountry ? 0 : 1;
    const bHome = (b.country_code ?? 'BF') === priorityCountry ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

/**
 * Full display sort for category rows:
 *   1. Selected-country events before other-country events
 *   2. Within each group: upcoming (date ≥ today) before past events
 *   3. Upcoming: ascending by date (soonest first)
 *   4. Past: descending by date (most-recent past first)
 */
export function sortEventsForDisplay<T extends { date: string; country_code?: string }>(
  events: T[],
  priorityCountry: string | null | undefined
): T[] {
  const today = new Date().toISOString().split('T')[0];
  return [...events].sort((a, b) => {
    // 1. Country priority
    const aHome = priorityCountry && (a.country_code ?? 'BF') === priorityCountry ? 0 : 1;
    const bHome = priorityCountry && (b.country_code ?? 'BF') === priorityCountry ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;

    // 2. Upcoming before past
    const aUpcoming = a.date >= today ? 0 : 1;
    const bUpcoming = b.date >= today ? 0 : 1;
    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;

    // 3. Within upcoming: soonest first; within past: most-recent first
    const dir = aUpcoming === 0 ? 1 : -1;
    return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
  });
}

/**
 * Builds the full address string shown on the event detail page.
 * Priority: address > location, with city/country appended when available.
 */
export function fullAddressDisplay(event: {
  location: string;
  address?: string;
  city?: string;
  region?: string;
  country_code?: string;
}): string {
  const parts: string[] = [];
  if (event.address) {
    parts.push(event.address);
  } else {
    parts.push(event.location);
  }
  if (event.city && event.city !== event.location && event.city !== event.address) {
    parts.push(event.city);
  }
  if (event.region) parts.push(event.region);
  const country = getCountryMeta(event.country_code ?? 'BF');
  if (country && event.country_code !== 'BF') parts.push(country.nameFr);
  return parts.join(', ');
}
