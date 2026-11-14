import type { Event } from '../types/event';
import { calendarDayInZone, formatCalendarDate, formatEventTime } from './formatters';
import { SHOW_FREE_FROM_ZERO_PRICE } from './labels';
import { shortPlace } from './eventGeo';

export interface ScheduleSpan {
  dates: string[];
  min: string;
  max: string;
}

export type BadgeKind = 'live' | 'dates' | 'past' | 'featured' | 'permanent' | 'free';

export interface EventBadge {
  kind: BadgeKind;
  label: string;
}

const TZ = 'Africa/Ouagadougou';

export function ymd(iso?: string | null): string {
  return String(iso || '').split('T')[0];
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = ymd(iso).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string): number {
  const [y, m, d] = ymd(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Saturday–Sunday around today, in the Ouagadougou calendar. */
export function weekendBounds(today = calendarDayInZone()): { start: string; end: string } {
  const dow = weekdayIndex(today);
  const toSat = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const start = addDays(today, toSat);
  return { start, end: addDays(start, 1) };
}

export function nextWeekBounds(today = calendarDayInZone()): { start: string; end: string } {
  const { end } = weekendBounds(today);
  const start = addDays(end, 1);
  return { start, end: addDays(start, 6) };
}

export function spanFor(event: Event, extra?: ScheduleSpan | null): ScheduleSpan {
  const fromTable = extra?.dates.filter(Boolean) ?? [];
  const own = ymd(event.date);
  const dates = [...new Set([...fromTable, own].filter(Boolean))].sort();
  return { dates, min: dates[0] || '', max: dates[dates.length - 1] || '' };
}

export function isPastSpan(span: ScheduleSpan, today = calendarDayInZone()): boolean {
  return Boolean(span.max) && span.max < today;
}

export function isLiveSpan(span: ScheduleSpan, today = calendarDayInZone()): boolean {
  return Boolean(span.min && span.max && span.min < today && span.max >= today);
}

export function overlaps(span: ScheduleSpan, start: string, end: string): boolean {
  return span.dates.some((day) => day >= start && day <= end) || (span.min <= end && span.max >= start && Boolean(span.min));
}

export function cityKey(event: Event): 'ouaga' | 'bobo' | 'abidjan' | 'other' {
  const blob = `${event.city ?? ''} ${event.location ?? ''}`.toLowerCase();
  if (blob.includes('abidjan')) return 'abidjan';
  if (blob.includes('bobo')) return 'bobo';
  if (blob.includes('ouaga') || blob.includes('palais des congr')) return 'ouaga';
  return 'other';
}

export function cityName(key: ReturnType<typeof cityKey> | string): string {
  if (key === 'ouaga' || /ouaga/i.test(key)) return 'Ouagadougou';
  if (key === 'bobo' || /bobo/i.test(key)) return 'Bobo-Dioulasso';
  if (key === 'abidjan' || /abidjan/i.test(key)) return 'Abidjan';
  return key;
}

export type CategoryKind = 'concert' | 'festival' | 'cinema' | 'attraction' | 'other';

export function categoryKind(name?: string | null): CategoryKind {
  const n = (name || '').toLowerCase();
  if (n.includes('concert') || n.includes('music')) return 'concert';
  if (n.includes('festival')) return 'festival';
  if (n.includes('cin') || n.includes('cinema')) return 'cinema';
  if (n.includes('attract')) return 'attraction';
  return 'other';
}

export function eventBadges(event: Event, span: ScheduleSpan, today = calendarDayInZone()): EventBadge[] {
  const out: EventBadge[] = [];
  if (event.is_permanent) {
    out.push({ kind: 'permanent', label: 'Ouvert toute l’année' });
    return out.slice(0, 2);
  }
  if (isLiveSpan(span, today)) out.push({ kind: 'live', label: 'En cours' });
  else if (isPastSpan(span, today)) out.push({ kind: 'past', label: 'Terminé' });
  if (span.dates.length > 1 && !isPastSpan(span, today)) {
    out.push({ kind: 'dates', label: `${span.dates.length} dates` });
  }
  if (event.featured && !isPastSpan(span, today)) out.push({ kind: 'featured', label: 'À la une' });
  if (SHOW_FREE_FROM_ZERO_PRICE && event.price === 0) out.push({ kind: 'free', label: 'Gratuit' });
  return out.slice(0, 2);
}

export function whenLabel(event: Event, span: ScheduleSpan, today = calendarDayInZone()): string {
  if (event.is_permanent) return 'Ouvert tous les jours';
  if (!span.min) return 'Date à confirmer';
  const tz = event.timezone || TZ;
  if (isLiveSpan(span, today)) {
    if (span.max === today) return 'En cours · dernier jour';
    const end = formatCalendarDate(span.max, { weekday: 'short', day: 'numeric', month: 'short' }, tz);
    return `En cours · jusqu’au ${end}`;
  }
  if (span.min !== span.max) {
    const a = formatCalendarDate(span.min, { weekday: 'short', day: 'numeric', month: 'short' }, tz);
    const b = formatCalendarDate(span.max, { weekday: 'short', day: 'numeric', month: 'short' }, tz);
    return `${a} → ${b}`;
  }
  const day = formatCalendarDate(span.min, { weekday: 'short', day: 'numeric', month: 'short' }, tz);
  const time = formatEventTime(event.time);
  return time ? `${day} · ${time}` : day;
}

export function placeLabel(event: Event): string {
  const place = shortPlace(event.location, event.city);
  if (place.label) return place.label;
  if (event.city) return `${event.city} · lieu communiqué bientôt`;
  return 'Lieu communiqué bientôt';
}

export function dedupeEvents(events: Event[]): Event[] {
  const byKey = new Map<string, Event>();
  for (const event of events) {
    const key = `${event.title.trim().toLowerCase()}|${ymd(event.date)}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, event);
      continue;
    }
    const prevScore = (prev.featured ? 2 : 0) + (prev.ticket_types?.length ?? 0);
    const nextScore = (event.featured ? 2 : 0) + (event.ticket_types?.length ?? 0);
    if (nextScore > prevScore) byKey.set(key, event);
  }
  return [...byKey.values()];
}

export function listedPrice(event: {
  price?: number | null;
  ticket_types?: { price?: number | null; sales_enabled?: boolean | null }[] | null;
}): number | null {
  const opened = (event.ticket_types ?? []).filter(
    (ticket) => ticket.sales_enabled === true && Number(ticket.price) > 0,
  );
  if (opened.length) return Math.min(...opened.map((ticket) => Number(ticket.price)));
  if (event.ticket_types && event.ticket_types.length > 0) return null;
  const fallback = Number(event.price ?? NaN);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

export function thisWeekBounds(today = calendarDayInZone()): { start: string; end: string } {
  const dow = weekdayIndex(today);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const start = addDays(today, mondayOffset);
  return { start, end: addDays(start, 6) };
}

export function prefersDataSaver(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

export interface DayGroup {
  date: string;
  label: string;
  events: Event[];
}

export interface AgendaGroup {
  id: string;
  title: string;
  hint: string;
  days: DayGroup[];
}

export function groupAgenda(events: Event[], spans: Map<string, ScheduleSpan>, today = calendarDayInZone()): AgendaGroup[] {
  const weekend = weekendBounds(today);
  const next = nextWeekBounds(today);
  const month = today.slice(0, 7);
  const used = new Set<string>();
  const take = (id: string, title: string, hint: string, match: (event: Event, span: ScheduleSpan) => boolean, dayOf: (event: Event, span: ScheduleSpan) => string) => {
    const picked = events.filter((event) => {
      if (used.has(event.id) || event.is_permanent) return false;
      const span = spans.get(event.id) ?? spanFor(event);
      return match(event, span);
    });
    if (!picked.length) return null;
    picked.forEach((event) => used.add(event.id));
    const byDay = new Map<string, Event[]>();
    picked.forEach((event) => {
      const span = spans.get(event.id) ?? spanFor(event);
      const day = dayOf(event, span) || span.min;
      const list = byDay.get(day) ?? [];
      list.push(event);
      byDay.set(day, list);
    });
    const days = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => ({
        date,
        label: date ? formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'long' }, TZ) : '',
        events: list,
      }));
    return { id, title, hint, days };
  };

  const groups: Array<AgendaGroup | null> = [
    take('live', 'En ce moment', '', (_e, span) => isLiveSpan(span, today), (_e, span) => span.min),
    take('weekend', 'Ce week-end', '', (_e, span) => overlaps(span, weekend.start, weekend.end), (e) => ymd(e.date)),
    take('next', 'La semaine prochaine', '', (_e, span) => overlaps(span, next.start, next.end), (e) => ymd(e.date)),
    take('month', 'Plus tard ce mois-ci', '', (e, span) => ymd(e.date).startsWith(month) && span.max >= today, (e) => ymd(e.date)),
  ];

  const later = events.filter((event) => !used.has(event.id) && !event.is_permanent && !isPastSpan(spans.get(event.id) ?? spanFor(event), today));
  const byMonth = new Map<string, Event[]>();
  later.forEach((event) => {
    const key = ymd(event.date).slice(0, 7) || 'sans-date';
    const list = byMonth.get(key) ?? [];
    list.push(event);
    byMonth.set(key, list);
  });
  [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([key, list]) => {
    const label = key === 'sans-date'
      ? 'Date à confirmer'
      : formatCalendarDate(`${key}-01`, { month: 'long', year: 'numeric' }, TZ);
    const days = new Map<string, Event[]>();
    list.forEach((event) => {
      const day = ymd(event.date);
      const bucket = days.get(day) ?? [];
      bucket.push(event);
      days.set(day, bucket);
    });
    groups.push({
      id: key,
      title: label.charAt(0).toUpperCase() + label.slice(1),
      hint: '',
      days: [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, eventsInDay]) => ({
        date,
        label: date ? formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'long' }, TZ) : '',
        events: eventsInDay,
      })),
    });
  });

  return groups.filter((group): group is AgendaGroup => Boolean(group && group.days.length));
}
