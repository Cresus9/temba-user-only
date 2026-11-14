import type { Event, TicketType } from '../types/event';
import { supabase } from '../lib/supabase-client';
import { calendarDayInZone } from '../utils/formatters';
import { spanFor, type ScheduleSpan, ymd } from '../utils/eventDisplay';
import {
  addressIfDistinct,
  canonicalCity,
  cleanVenueName,
  countryName,
  eventDedupeKey,
  isCityOnlyVenue,
  venueMergeKey,
} from '../utils/venueNames';
import { genreKey, genreLabel, hasArtistPhoto } from '../utils/artistDisplay';

export interface CatalogShow {
  event: Event;
  span: ScheduleSpan;
  role?: string;
  venueName: string;
  city: string;
  upcoming: boolean;
  permanent: boolean;
}

export interface VenueGroup {
  key: string;
  name: string;
  city: string;
  country: string;
  slugs: string[];
  primarySlug: string;
  ids: string[];
  address: string;
  upcoming: CatalogShow[];
  past: CatalogShow[];
}

export interface CatalogArtist {
  id: string;
  name: string;
  slug: string;
  genre: string;
  genreKey: string;
  city: string;
  countryCode: string | null;
  bio: string;
  photo: string;
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    website?: string;
  };
  upcoming: CatalogShow[];
  past: CatalogShow[];
}

export interface Catalog {
  venues: VenueGroup[];
  artists: CatalogArtist[];
  today: string;
}

type EventRow = {
  id: string;
  slug?: string | null;
  title?: string | null;
  date?: string | null;
  time?: string | null;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  is_permanent?: boolean | null;
  venue_id?: string | null;
  city?: string | null;
  location?: string | null;
  featured?: boolean | null;
  deleted_at?: string | null;
  ticket_types?: { id?: string; price?: number | null; sales_enabled?: boolean | null }[] | null;
};

type VenueRow = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country_code: string | null;
  address: string | null;
};

type ArtistRow = {
  id: string;
  name: string;
  slug: string | null;
  genre: string | null;
  photo_url: string | null;
  city: string | null;
  country_code: string | null;
  bio: string | null;
  social_links: CatalogArtist['social'] | null;
};

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function loadDates(ids: string[]) {
  const rows: { event_id: string; date: string }[] = [];
  for (const part of chunk(ids, 80)) {
    const { data, error } = await supabase.from('event_dates').select('event_id, date').in('event_id', part);
    if (error) break;
    rows.push(...((data ?? []) as { event_id: string; date: string }[]));
  }
  const byEvent = new Map<string, string[]>();
  rows.forEach((row) => {
    const day = ymd(row.date);
    if (!day) return;
    const list = byEvent.get(row.event_id) ?? [];
    list.push(day);
    byEvent.set(row.event_id, list);
  });
  return byEvent;
}

function toEvent(row: EventRow, venueName: string, city: string): Event {
  const tickets = (row.ticket_types ?? []).map((ticket) => ({
    id: ticket.id || `${row.id}-price`,
    name: '',
    price: Number(ticket.price) || 0,
    sales_enabled: ticket.sales_enabled === true,
  })) as TicketType[];
  return {
    id: row.id,
    title: (row.title || 'Événement').trim(),
    description: '',
    date: row.date || '',
    time: row.time || '',
    location: venueName,
    image_url: row.image_url || '',
    price: Number(row.price) || 0,
    currency: row.currency || 'XOF',
    capacity: 0,
    tickets_sold: 0,
    status: 'PUBLISHED',
    featured: Boolean(row.featured),
    slug: row.slug,
    city,
    is_permanent: Boolean(row.is_permanent),
    ticket_types: tickets,
  };
}

function showScore(show: CatalogShow) {
  const open = (show.event.ticket_types ?? []).some((ticket) => ticket.sales_enabled && Number(ticket.price) > 0);
  return (open ? 4 : 0) + (show.event.image_url ? 2 : 0) + (show.event.slug ? 1 : 0);
}

function dedupeShows(shows: CatalogShow[]) {
  const byKey = new Map<string, CatalogShow>();
  for (const show of shows) {
    const key = eventDedupeKey(show.event.title, show.span.min || ymd(show.event.date));
    const prev = byKey.get(key);
    if (!prev || showScore(show) > showScore(prev)) byKey.set(key, show);
  }
  return [...byKey.values()];
}

function sortShows(shows: CatalogShow[]) {
  const upcoming = shows
    .filter((show) => show.upcoming)
    .sort((a, b) => Number(a.permanent) - Number(b.permanent) || (a.span.min || '').localeCompare(b.span.min || ''));
  const past = shows
    .filter((show) => !show.upcoming)
    .sort((a, b) => (b.span.max || '').localeCompare(a.span.max || ''));
  return { upcoming, past };
}

async function fetchEvents(): Promise<EventRow[]> {
  const columns = 'id, slug, title, date, time, image_url, price, currency, is_permanent, venue_id, city, location, featured, deleted_at, ticket_types(id, price, sales_enabled)';
  const first = await supabase.from('events').select(columns).eq('status', 'PUBLISHED').is('deleted_at', null);
  if (!first.error) return (first.data ?? []) as EventRow[];
  const second = await supabase
    .from('events')
    .select('id, slug, title, date, time, image_url, price, currency, is_permanent, venue_id, city, location, featured, ticket_types(id, price, sales_enabled)')
    .eq('status', 'PUBLISHED');
  if (second.error) throw second.error;
  return (second.data ?? []) as EventRow[];
}

export async function loadCatalog(): Promise<Catalog> {
  const today = calendarDayInZone();
  const [venuesRes, artistsRes, linksRes, events] = await Promise.all([
    supabase.from('venues').select('id, name, slug, city, country_code, address'),
    supabase.from('artists').select('id, name, slug, genre, photo_url, city, country_code, bio, social_links').order('name'),
    supabase.from('event_artists').select('artist_id, event_id, role'),
    fetchEvents(),
  ]);
  if (venuesRes.error) throw venuesRes.error;
  if (artistsRes.error) throw artistsRes.error;

  const dates = await loadDates(events.map((event) => event.id));
  const venues = (venuesRes.data ?? []) as VenueRow[];
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  const groups = new Map<string, VenueGroup & { rawShows: CatalogShow[] }>();
  for (const venue of venues) {
    if (!venue.name || isCityOnlyVenue(venue.name)) continue;
    const city = canonicalCity(venue.city, venue.name);
    const name = cleanVenueName(venue.name, city);
    const key = venueMergeKey(venue.name, city);
    const group = groups.get(key) ?? {
      key,
      name,
      city,
      country: countryName(venue.country_code, city),
      slugs: [],
      primarySlug: '',
      ids: [],
      address: '',
      upcoming: [],
      past: [],
      rawShows: [],
    };
    group.ids.push(venue.id);
    if (venue.slug) group.slugs.push(venue.slug);
    if (!group.address) group.address = addressIfDistinct(name, venue.address);
    if (venue.country_code) group.country = countryName(venue.country_code, city);
    groups.set(key, group);
  }

  const eventMeta = new Map<string, { show: CatalogShow; venueId: string | null }>();
  for (const row of events) {
    if (row.deleted_at) continue;
    const venue = row.venue_id ? venueById.get(row.venue_id) : undefined;
    const city = canonicalCity(venue?.city || row.city, venue?.name || row.location);
    const venueName = venue && !isCityOnlyVenue(venue.name)
      ? cleanVenueName(venue.name, city)
      : cleanVenueName(row.location || row.city || 'Lieu', city);
    const event = toEvent(row, venueName, city);
    const span = spanFor(event, dates.get(row.id)?.length ? { dates: dates.get(row.id) || [], min: '', max: '' } : null);
    const permanent = Boolean(row.is_permanent);
    const upcoming = permanent || Boolean(span.max && span.max >= today);
    const show: CatalogShow = { event, span, venueName, city, upcoming, permanent };
    eventMeta.set(row.id, { show, venueId: row.venue_id || null });
    if (!venue || isCityOnlyVenue(venue.name)) continue;
    const group = groups.get(venueMergeKey(venue.name, city));
    if (group) group.rawShows.push(show);
  }

  const venueList: VenueGroup[] = [];
  for (const group of groups.values()) {
    if (!group.rawShows.length || !group.slugs.length) continue;
    const unique = dedupeShows(group.rawShows);
    const sorted = sortShows(unique);
    const slugScore = new Map<string, number>();
    for (const id of group.ids) {
      const venue = venueById.get(id);
      if (!venue?.slug) continue;
      const n = group.rawShows.filter((show) => eventMeta.get(show.event.id)?.venueId === id).length;
      slugScore.set(venue.slug, n);
    }
    group.primarySlug = [...group.slugs].sort((a, b) => (slugScore.get(b) || 0) - (slugScore.get(a) || 0))[0];
    venueList.push({
      key: group.key,
      name: group.name,
      city: group.city,
      country: group.country,
      slugs: group.slugs,
      primarySlug: group.primarySlug,
      ids: group.ids,
      address: group.address,
      upcoming: sorted.upcoming,
      past: sorted.past,
    });
  }
  venueList.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const links = (linksRes.error ? [] : linksRes.data ?? []) as { artist_id: string; event_id: string; role?: string | null }[];
  const linksByArtist = new Map<string, { event_id: string; role?: string | null }[]>();
  links.forEach((link) => {
    const list = linksByArtist.get(link.artist_id) ?? [];
    list.push(link);
    linksByArtist.set(link.artist_id, list);
  });

  const artists: CatalogArtist[] = ((artistsRes.data ?? []) as ArtistRow[])
    .filter((artist) => artist.slug)
    .map((artist) => {
      const shows = dedupeShows(
        (linksByArtist.get(artist.id) ?? [])
          .map((link) => {
            const meta = eventMeta.get(link.event_id);
            if (!meta) return null;
            return { ...meta.show, role: link.role || undefined };
          })
          .filter(Boolean) as CatalogShow[],
      );
      const sorted = sortShows(shows);
      const social = artist.social_links ?? {};
      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug as string,
        genre: genreLabel(artist.genre),
        genreKey: genreKey(artist.genre),
        city: canonicalCity(artist.city, artist.name),
        countryCode: artist.country_code,
        bio: (artist.bio || '').trim(),
        photo: hasArtistPhoto(artist.photo_url, artist.slug) ? (artist.photo_url as string) : '',
        social: {
          instagram: social.instagram?.trim() || undefined,
          facebook: social.facebook?.trim() || undefined,
          youtube: social.youtube?.trim() || undefined,
          website: social.website?.trim() || undefined,
        },
        upcoming: sorted.upcoming,
        past: sorted.past,
      };
    });

  return { venues: venueList, artists, today };
}

let pending: Promise<Catalog> | null = null;

export function getCatalog() {
  if (!pending) {
    pending = loadCatalog().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

export function venueBySlug(catalog: Catalog, slug: string) {
  return catalog.venues.find((venue) => venue.slugs.includes(slug) || venue.primarySlug === slug) || null;
}

export const MAIN_CITIES = ['Ouagadougou', 'Bobo-Dioulasso', 'Abidjan'] as const;

export function isMainCity(city: string) {
  return (MAIN_CITIES as readonly string[]).includes(city);
}
