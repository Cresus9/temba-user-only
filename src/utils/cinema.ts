/**
 * Cinéma : séances d'un film (event_dates) et prix par séance.
 * Pure helpers, no network. Dates are YYYY-MM-DD read with parseLocalDate.
 */
import { formatEventTime, parseLocalDate } from './formatters';

export interface SeancePrice {
  ticket_type_id: string;
  price: number;
  base_price: number;
  is_override: boolean;
}

export type SeanceState = 'open' | 'filling' | 'sold_out' | 'past';

export interface Seance {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  end_is_estimate: boolean;
  hall: string | null;
  version: string | null;
  format: string | null;
  capacity: number | null;
  remaining: number | null;
  state: SeanceState;
  prices: SeancePrice[];
}

export interface FilmDetails {
  duration_minutes: number | null;
  age_rating: string | null;
  original_language: string | null;
  directors: string[];
  cast_names: string[];
  genres: string[];
  production: string | null;
}

/** "1 000 F CFA" */
export function fcfa(amount: number): string {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0));
  return `${n.replace(/\u202f|\u00a0/g, ' ')} F CFA`;
}

/** Only the « Cinema » category (not every name that contains « cin »). */
export function isCinemaCategoryName(name?: string | null): boolean {
  const n = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return n === 'cinema';
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (v == null ? '' : String(v));
const numOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v));

export function normalizeSeance(row: Raw): Seance {
  const state = String(row?.state || 'open') as SeanceState;
  return {
    id: str(row.id),
    date: str(row.date).split('T')[0],
    start_time: formatEventTime(str(row.start_time)) || str(row.start_time),
    end_time: formatEventTime(str(row.end_time)) || null,
    end_is_estimate: Boolean(row.end_is_estimate),
    hall: str(row.hall) || null,
    version: str(row.version) || null,
    format: str(row.format) || null,
    capacity: numOrNull(row.capacity),
    remaining: numOrNull(row.remaining),
    state: ['open', 'filling', 'sold_out', 'past'].includes(state) ? state : 'open',
    prices: Array.isArray(row.prices)
      ? (row.prices as Raw[]).map((p) => ({
          ticket_type_id: String(p.ticket_type_id),
          price: Number(p.price) || 0,
          base_price: Number(p.base_price) || 0,
          is_override: Boolean(p.is_override),
        }))
      : [],
  };
}

/** Distinct projection days, in order. */
export function seanceDays(seances: Seance[]): string[] {
  return Array.from(new Set(seances.map((s) => s.date))).sort();
}

export function seancesOn(seances: Seance[], day: string): Seance[] {
  return seances
    .filter((s) => s.date === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time) || (a.hall || '').localeCompare(b.hall || ''));
}

export function isBookable(s: Seance): boolean {
  return s.state === 'open' || s.state === 'filling';
}

/** Price of a ticket type at a séance; falls back to the ticket type price. */
export function seancePrice(s: Seance | null | undefined, ticketTypeId: string, fallback: number): number {
  const hit = s?.prices.find((p) => p.ticket_type_id === ticketTypeId);
  return hit ? hit.price : Number(fallback) || 0;
}

/** True when at least one price differs between séances. */
export function pricesVary(seances: Seance[]): boolean {
  const seen = new Map<string, number>();
  for (const s of seances) {
    for (const p of s.prices) {
      const prev = seen.get(p.ticket_type_id);
      if (prev != null && prev !== p.price) return true;
      seen.set(p.ticket_type_id, p.price);
    }
  }
  return false;
}

/** Lowest price among the given ticket types over the bookable séances. */
export function lowestPrice(seances: Seance[], ticketTypeIds: string[]): number | null {
  let low: number | null = null;
  for (const s of seances) {
    if (!isBookable(s)) continue;
    for (const p of s.prices) {
      if (!ticketTypeIds.includes(p.ticket_type_id) || p.price <= 0) continue;
      low = low == null ? p.price : Math.min(low, p.price);
    }
  }
  return low;
}

export function crossesMidnight(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  return end <= start;
}

/** "20:30 – 22:15" or "20:30" */
export function seanceHours(start?: string | null, end?: string | null): string {
  const a = formatEventTime(start);
  const b = formatEventTime(end);
  if (!a) return '';
  return b ? `${a} – ${b}` : a;
}

/** "Salle 1 · VF · 3D" (empty when nothing is set) */
export function seanceExtras(s: { hall?: string | null; version?: string | null; format?: string | null }): string {
  return [s.hall, s.version, s.format].filter(Boolean).join(' · ');
}

const weekdayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const longFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function weekdayShort(iso: string): string {
  return weekdayFmt.format(parseLocalDate(iso)).replace('.', '');
}

export function dayNumber(iso: string): number {
  return parseLocalDate(iso).getDate();
}

export function monthShort(iso: string): string {
  return monthFmt.format(parseLocalDate(iso)).replace('.', '');
}

export function longDay(iso: string): string {
  return longFmt.format(parseLocalDate(iso));
}

export function durationLabel(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Apply séance prices to checkout lines (id + price). */
export function withSeancePrices<T extends { id: string; price: number }>(lines: T[], overrides: Map<string, number>): T[] {
  return lines.map((line) => (overrides.has(line.id) ? { ...line, price: overrides.get(line.id) as number } : line));
}
