import { supabase } from '../lib/supabase-client';
import type {
  VisitDate,
  VisitDateAvailability,
  PermanentPurchaseResult,
  PermanentTicketType,
} from '../types/event';

// ─────────────────────────────────────────────────────────────────────────────
// permanentVenueService
//
// Thin wrappers around the backend RPCs + table queries for permanent
// attractions (zoos, parks, museums, etc.).  All DB interaction goes through
// here — UI components never call supabase directly for permanent venue logic.
// ─────────────────────────────────────────────────────────────────────────────

export interface OperatingHoursRow {
  id?: string;
  event_id: string;
  day_of_week: number;   // 0=Sun … 6=Sat
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  daily_capacity: number | null;
}

export interface OperatingException {
  id?: string;
  event_id: string;
  exception_date: string;   // YYYY-MM-DD
  is_closed: boolean;
  open_time?: string | null;
  close_time?: string | null;
  daily_capacity?: number | null;
  reason?: string;
}

export interface PricingOverride {
  ticket_type_id: string;
  day_type: 'weekday' | 'weekend' | 'holiday';
  price: number;
}

// ── 1. Upcoming schedule ─────────────────────────────────────────────────────

export async function getPermanentSchedule(
  eventId: string,
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; dates: VisitDate[]; error?: string }> {
  const { data, error } = await supabase.rpc('get_permanent_schedule', {
    p_event_id:   eventId,
    p_start_date: startDate ?? null,
    p_end_date:   endDate   ?? null,
  });

  if (error) {
    console.warn('[permanentVenueService] get_permanent_schedule RPC failed, using direct query:', error.message);
    return _getPermanentScheduleDirect(eventId, startDate, endDate);
  }

  return { success: true, dates: (data as any)?.dates ?? [], ...(data as any) };
}

/** Direct table fallback used when the RPC is unavailable or has a SQL error. */
async function _getPermanentScheduleDirect(
  eventId: string,
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; dates: VisitDate[]; error?: string }> {
  let q = supabase
    .from('event_dates')
    .select('id, date, start_time, end_time, capacity, status, day_type')
    .eq('event_id', eventId)
    .order('date', { ascending: true });

  if (startDate) q = q.gte('date', startDate);
  if (endDate)   q = q.lte('date', endDate);

  const { data, error } = await q;
  if (error) return { success: false, dates: [], error: error.message };

  const dates: VisitDate[] = (data ?? []).map((row: any) => ({
    date:          row.date,
    event_date_id: row.id,
    day_type:      row.day_type  ?? 'weekday',
    open_time:     row.start_time ?? null,
    close_time:    row.end_time   ?? null,
    capacity:      row.capacity  ?? null,
    tickets_sold:  0,
    remaining:     row.capacity  ?? 9999,
    status:        row.status?.toLowerCase() === 'active' ? 'active' : (row.status ?? 'active'),
    time_slots:    [],
    ticket_types:  [],
  }));

  return { success: true, dates };
}

// ── 2. Check a specific visit date ──────────────────────────────────────────

export async function checkVisitDateAvailable(
  eventId: string,
  visitDate: string,
  timeSlotId?: string,
): Promise<VisitDateAvailability> {
  const { data, error } = await supabase.rpc('check_visit_date_available', {
    p_event_id:     eventId,
    p_visit_date:   visitDate,
    p_time_slot_id: timeSlotId ?? null,
  });

  if (error) {
    console.error('[permanentVenueService] check_visit_date_available:', error);
    return { available: false, message: error.message };
  }

  return (data as VisitDateAvailability) ?? { available: false };
}

// ── 3. Create a permanent-attraction purchase ────────────────────────────────

export async function initiatePermanentPurchase(
  eventId: string,
  visitDate: string,
  selections: { ticket_type_id: string; quantity: number }[],
  options?: {
    timeSlotId?: string;
    guestEmail?: string;
    paymentMethod?: 'CASH' | 'CARD' | 'MOBILE_MONEY';
  },
): Promise<PermanentPurchaseResult> {
  const { data, error } = await supabase.rpc('initiate_permanent_purchase', {
    p_event_id:          eventId,
    p_visit_date:        visitDate,
    p_ticket_selections: selections,
    p_time_slot_id:      options?.timeSlotId      ?? null,
    p_guest_email:       options?.guestEmail       ?? null,
    p_payment_method:    options?.paymentMethod    ?? 'CASH',
  });

  if (error) {
    console.error('[permanentVenueService] initiate_permanent_purchase:', error);
    return { success: false, error: error.message };
  }

  return (data as PermanentPurchaseResult) ?? { success: false, error: 'No response' };
}

// ── 4. Trigger schedule (re)generation ───────────────────────────────────────

export async function generateSchedule(
  eventId: string,
  daysAhead = 90,
): Promise<{ success: boolean; dates_created?: number; error?: string }> {
  const { data, error } = await supabase.rpc('generate_permanent_event_dates', {
    p_event_id:   eventId,
    p_days_ahead: daysAhead,
  });

  if (error) {
    console.error('[permanentVenueService] generate_permanent_event_dates:', error);
    return { success: false, error: error.message };
  }

  return (data as any) ?? { success: true };
}

// ── 5. Operating hours CRUD ──────────────────────────────────────────────────

export async function getOperatingHours(eventId: string): Promise<OperatingHoursRow[]> {
  const { data, error } = await supabase
    .from('venue_operating_hours')
    .select('*')
    .eq('event_id', eventId)
    .order('day_of_week');

  if (error) console.error('[permanentVenueService] getOperatingHours:', error);
  return (data as OperatingHoursRow[]) ?? [];
}

export async function upsertOperatingHours(rows: OperatingHoursRow[]): Promise<boolean> {
  const { error } = await supabase
    .from('venue_operating_hours')
    .upsert(rows, { onConflict: 'event_id,day_of_week' });

  if (error) console.error('[permanentVenueService] upsertOperatingHours:', error);
  return !error;
}

// ── 6. Operating exceptions CRUD ─────────────────────────────────────────────

export async function getOperatingExceptions(eventId: string): Promise<OperatingException[]> {
  const { data, error } = await supabase
    .from('venue_operating_exceptions')
    .select('*')
    .eq('event_id', eventId)
    .order('exception_date');

  if (error) console.error('[permanentVenueService] getOperatingExceptions:', error);
  return (data as OperatingException[]) ?? [];
}

export async function upsertOperatingException(row: OperatingException): Promise<boolean> {
  const { error } = await supabase
    .from('venue_operating_exceptions')
    .upsert(row, { onConflict: 'event_id,exception_date' });

  if (error) console.error('[permanentVenueService] upsertOperatingException:', error);
  return !error;
}

export async function deleteOperatingException(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('venue_operating_exceptions')
    .delete()
    .eq('id', id);

  if (error) console.error('[permanentVenueService] deleteOperatingException:', error);
  return !error;
}

// ── 7. Pricing overrides ─────────────────────────────────────────────────────

export async function getPricingOverrides(
  ticketTypeIds: string[],
): Promise<PricingOverride[]> {
  if (!ticketTypeIds.length) return [];

  const { data, error } = await supabase
    .from('ticket_type_pricing_overrides')
    .select('ticket_type_id, day_type, price')
    .in('ticket_type_id', ticketTypeIds);

  if (error) console.error('[permanentVenueService] getPricingOverrides:', error);
  return (data as PricingOverride[]) ?? [];
}

export async function upsertPricingOverride(row: PricingOverride): Promise<boolean> {
  const { error } = await supabase
    .from('ticket_type_pricing_overrides')
    .upsert(row, { onConflict: 'ticket_type_id,day_type' });

  if (error) console.error('[permanentVenueService] upsertPricingOverride:', error);
  return !error;
}

// ── 8. List permanent attractions ────────────────────────────────────────────

export async function listAttractions(filters?: {
  type?: string;
  countryCode?: string;
  city?: string;
}) {
  let query = supabase
    .from('events')
    .select(`
      id, title, description, image_url, attraction_type,
      venue, location, city, country_code,
      capacity, sales_start_date, featured,
      ticket_types(id, name, price, available, sales_enabled)
    `)
    .eq('is_permanent', true)
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    // Featured/favorited attractions float to the top, then alphabetical
    .order('featured', { ascending: false })
    .order('title');

  if (filters?.type)        query = query.eq('attraction_type', filters.type);
  if (filters?.countryCode) query = query.eq('country_code', filters.countryCode);
  if (filters?.city)        query = query.ilike('city', `%${filters.city}%`);

  const { data, error } = await query;
  if (error) console.error('[permanentVenueService] listAttractions:', error);
  return data ?? [];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const ATTRACTION_TYPE_LABELS: Record<string, string> = {
  zoo:            'Zoo',
  park:           'Parc',
  museum:         'Musée',
  theme_park:     'Parc d\'attractions',
  aquarium:       'Aquarium',
  water_park:     'Parc aquatique',
  cultural_site:  'Site culturel',
  adventure_park: 'Parc aventure',
  other:          'Autre',
};

export const ATTRACTION_TYPE_ICONS: Record<string, string> = {
  zoo:            '🦁',
  park:           '🌳',
  museum:         '🏛️',
  theme_park:     '🎡',
  aquarium:       '🐠',
  water_park:     '💦',
  cultural_site:  '🏺',
  adventure_park: '🧗',
  other:          '📍',
};

/** Returns "Ouvert · 09:00–18:00" or "Fermé" */
export function formatOpeningHours(
  open_time: string | null,
  close_time: string | null,
  is_closed = false,
): string {
  if (is_closed || !open_time) return 'Fermé';
  return `Ouvert · ${open_time}–${close_time ?? '?'}`;
}

/** "weekday" → "Semaine", "weekend" → "Week-end", "holiday" → "Jour férié" */
export function dayTypeLabel(dayType: string): string {
  return { weekday: 'Semaine', weekend: 'Week-end', holiday: 'Jour férié' }[dayType] ?? dayType;
}
