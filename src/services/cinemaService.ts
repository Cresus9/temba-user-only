/**
 * Cinéma : chargement des séances (get_event_seances), de la fiche film et
 * des prix par séance. Tout échoue en douceur : sans la migration
 * 20261127160000_cinema_seances, les fonctions renvoient null / vide et la
 * page garde l'affichage actuel.
 */
import { supabase } from '../lib/supabase-client';
import { formatEventTime } from '../utils/formatters';
import { isCinemaCategoryName, normalizeSeance, seanceExtras, seanceHours, type FilmDetails, type Seance } from '../utils/cinema';

type CategoryRow = { event_id?: string; categories?: { name?: string | null } | { name?: string | null }[] | null };
function categoryName(row: CategoryRow): string | null | undefined {
  const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return cat?.name;
}

export async function isCinemaEvent(eventId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('event_category_relations')
    .select('categories(name)')
    .eq('event_id', eventId);
  if (error || !data) return false;
  return (data as CategoryRow[]).some((row) => isCinemaCategoryName(categoryName(row)));
}

export async function loadCinema(eventId: string): Promise<{ seances: Seance[]; film: FilmDetails | null } | null> {
  if (!eventId) return null;
  if (!(await isCinemaEvent(eventId))) return null;
  const { data, error } = await supabase.rpc('get_event_seances', { p_event_id: eventId });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const seances = (data as Record<string, unknown>[]).map(normalizeSeance);
  const { data: film } = await supabase
    .from('event_film_details')
    .select('duration_minutes, age_rating, original_language, directors, cast_names, genres, production')
    .eq('event_id', eventId)
    .maybeSingle();
  return {
    seances,
    film: film
      ? {
          duration_minutes: film.duration_minutes ?? null,
          age_rating: film.age_rating ?? null,
          original_language: film.original_language ?? null,
          directors: film.directors ?? [],
          cast_names: film.cast_names ?? [],
          genres: film.genres ?? [],
          production: film.production ?? null,
        }
      : null,
  };
}

/** ticket_type_id -> price for one séance. Empty map when none (or before the migration). */
export async function fetchSeancePrices(eventDateId?: string | null): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!eventDateId) return out;
  const { data, error } = await supabase
    .from('event_date_ticket_prices')
    .select('ticket_type_id, price')
    .eq('event_date_id', eventDateId);
  if (error || !data) return out;
  for (const row of data as { ticket_type_id: string; price: number }[]) out.set(row.ticket_type_id, Number(row.price) || 0);
  return out;
}

export interface SeanceInfo {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hall: string | null;
  version: string | null;
  format: string | null;
}

/** Séance rows by id, with hall / version / format when the columns exist. */
export async function fetchSeanceInfo(ids: string[]): Promise<Map<string, SeanceInfo>> {
  const out = new Map<string, SeanceInfo>();
  const clean = Array.from(new Set(ids.filter(Boolean)));
  if (!clean.length) return out;
  let rows: Array<Partial<SeanceInfo> & { id: string }> | null = null;
  const full = await supabase.from('event_dates').select('id, date, start_time, end_time, hall, version, format').in('id', clean);
  if (!full.error) rows = full.data;
  else {
    const base = await supabase.from('event_dates').select('id, date, start_time, end_time').in('id', clean);
    rows = base.data;
  }
  for (const r of rows || []) {
    out.set(r.id, {
      id: r.id,
      date: String(r.date || '').split('T')[0],
      start_time: r.start_time || null,
      end_time: r.end_time || null,
      hall: r.hall || null,
      version: r.version || null,
      format: r.format || null,
    });
  }
  return out;
}

/** Event ids (among the given ones) in the Cinema category. */
export async function cinemaEventIds(eventIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const clean = Array.from(new Set(eventIds.filter(Boolean)));
  if (!clean.length) return out;
  const { data, error } = await supabase
    .from('event_category_relations')
    .select('event_id, categories(name)')
    .in('event_id', clean);
  if (error || !data) return out;
  for (const row of data as CategoryRow[]) {
    if (row.event_id && isCinemaCategoryName(categoryName(row))) out.add(row.event_id);
  }
  return out;
}

export interface TicketSeance {
  /** "20:30 – 22:15" */
  hours: string;
  /** "Salle 1 · VF" */
  extras: string;
}

/**
 * Séance shown on a ticket / confirmation: only for Cinema events, only when the
 * ticket has its own séance (event_date_id).
 */
export async function ticketSeances(
  tickets: Array<{ event_date_id?: string | null; event_id?: string | null; event?: { id?: string } | null }>,
): Promise<Map<string, TicketSeance>> {
  const out = new Map<string, TicketSeance>();
  const dateIds = tickets.map((t) => t.event_date_id || '').filter(Boolean);
  if (!dateIds.length) return out;
  const eventIds = tickets.map((t) => t.event_id || t.event?.id || '').filter(Boolean);
  const [cinema, info] = await Promise.all([cinemaEventIds(eventIds), fetchSeanceInfo(dateIds)]);
  for (const t of tickets) {
    const ev = t.event_id || t.event?.id || '';
    const row = t.event_date_id ? info.get(t.event_date_id) : null;
    if (!row || !cinema.has(ev)) continue;
    out.set(row.id, { hours: seanceHours(row.start_time, row.end_time) || formatEventTime(row.start_time), extras: seanceExtras(row) });
  }
  return out;
}

const ORDER_SEANCE_KEY = 'temba_order_seances';

/** Remember the séance chosen at checkout, so the guest confirmation can show it. */
export function rememberOrderSeance(orderId: string, eventId: string, eventDateId?: string | null) {
  if (!orderId || !eventDateId) return;
  try {
    const all = JSON.parse(localStorage.getItem(ORDER_SEANCE_KEY) || '{}');
    all[orderId] = { eventId, eventDateId };
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - 20))) delete all[k];
    localStorage.setItem(ORDER_SEANCE_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

export function recallOrderSeance(orderId?: string | null): { eventId: string; eventDateId: string } | null {
  if (!orderId) return null;
  try {
    const hit = JSON.parse(localStorage.getItem(ORDER_SEANCE_KEY) || '{}')[orderId];
    return hit?.eventDateId ? hit : null;
  } catch {
    return null;
  }
}
