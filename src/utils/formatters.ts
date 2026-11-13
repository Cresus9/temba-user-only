/**
 * Parse a date-only string (YYYY-MM-DD or ISO with time) as local midnight.
 * Using `new Date("YYYY-MM-DD")` parses as UTC 00:00 which shifts back by one day
 * in negative-UTC-offset timezones (e.g. America/New_York). This avoids that bug.
 */
export const parseLocalDate = (dateString: string): Date => {
  const parts = dateString.split('T')[0].split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

/** Local calendar day as YYYY-MM-DD (not UTC). */
export function localTodayYmd(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Venue clock for Burkina Faso listings. GMT+0, no daylight saving. */
export const DEFAULT_EVENT_TZ = 'Africa/Ouagadougou';

/**
 * Today's calendar day in a venue timezone, as YYYY-MM-DD.
 * Independent of the browser timezone.
 */
export function calendarDayInZone(timeZone: string = DEFAULT_EVENT_TZ, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

/**
 * Format a stored event calendar day for display.
 * Date-only strings and ISO timestamps are reduced to their YYYY-MM-DD part
 * (the venue's calendar day) and formatted in that timezone. This avoids
 * `new Date("YYYY-MM-DD")`, which is UTC midnight and shows the previous day
 * in the Americas.
 */
export function formatCalendarDate(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
  timeZone: string = DEFAULT_EVENT_TZ,
  locale = 'fr-FR',
): string {
  if (!iso) return '';
  const datePart = String(iso).split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return '';
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(anchor);
  } catch {
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(anchor);
  }
}

/** "18:00" from "18:00:00" or an ISO time. Never shifts the clock. */
export function formatEventTime(time?: string | null): string {
  if (!time) return '';
  const match = String(time).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

export const formatCurrency = (amount: number, currency: string = 'XOF'): string => {
  const normalizedCurrency = currency?.toUpperCase?.() ?? 'XOF';

  if (normalizedCurrency === 'XOF') {
    const numeric = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${numeric} FCFA`;
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: normalizedCurrency,
  }).format(amount);
};