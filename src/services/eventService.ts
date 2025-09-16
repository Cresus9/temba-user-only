import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
import type { Event, TicketType } from '../types/event';

type EventRow = Event & {
  ticket_types: (TicketType | null)[] | null;
  categories: string[] | null;
};

type EventFilterRow = Pick<Event, 'location' | 'categories'>;

export interface EventServiceFilters {
  search?: string;
  location?: string;
  date?: string;
  category?: string;
}

export interface EventServiceOptions {
  supabaseClient?: SupabaseClient;
  logger?: Pick<Console, 'error' | 'warn'>;
}

const SEARCH_TERM_MAX_LENGTH = 120;
const LOCATION_TERM_MAX_LENGTH = 80;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const escapePatternOperators = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/[%_]/g, match => `\\${match}`);

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const sanitizePatternTerm = (
  raw: string,
  { limit, stripGroupingTokens }: { limit: number; stripGroupingTokens?: boolean },
): string => {
  const truncated = raw.slice(0, limit);
  const normalised = truncated
    .normalize('NFKC')
    .replace(CONTROL_CHARACTERS, ' ');
  const withoutGrouping = stripGroupingTokens
    ? normalised.replace(/[(),]/g, ' ')
    : normalised;
  const collapsed = collapseWhitespace(withoutGrouping);
  if (!collapsed) {
    return '';
  }
  return escapePatternOperators(collapsed);
};

const sanitizeSearchTerm = (raw: string): string =>
  sanitizePatternTerm(raw, { limit: SEARCH_TERM_MAX_LENGTH, stripGroupingTokens: true });

const sanitizeLocationTerm = (raw: string): string =>
  sanitizePatternTerm(raw, { limit: LOCATION_TERM_MAX_LENGTH });

const sanitiseFilterLabel = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalised = collapseWhitespace(value.normalize('NFKC').replace(CONTROL_CHARACTERS, ' '));
  return normalised || null;
};

const normaliseCategoryList = (categories: string[] | null | undefined): string[] | undefined => {
  if (!categories) {
    return undefined;
  }

  const normalised = categories
    .map((category) => sanitiseFilterLabel(category))
    .filter((category): category is string => Boolean(category));

  if (normalised.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalised));
};

export class EventService {
  private readonly supabase: SupabaseClient;
  private readonly logger: Pick<Console, 'error' | 'warn'>;

  constructor(options: EventServiceOptions = {}) {
    this.supabase = options.supabaseClient ?? supabase;
    this.logger = options.logger ?? console;
  }

  private normaliseFilters(filters: EventServiceFilters = {}): EventServiceFilters {
    const normalised: EventServiceFilters = {};

    if (typeof filters.search === 'string') {
      const sanitized = sanitizeSearchTerm(filters.search);
      if (sanitized) {
        normalised.search = sanitized;
      }
    }

    if (typeof filters.location === 'string') {
      const sanitizedLocation = sanitizeLocationTerm(filters.location);
      if (sanitizedLocation) {
        normalised.location = sanitizedLocation;
      }
    }

    if (typeof filters.category === 'string') {
      const trimmedCategory = filters.category.trim();
      if (trimmedCategory) {
        normalised.category = trimmedCategory;
      }
    }

    if (typeof filters.date === 'string') {
      const trimmedDate = filters.date.trim();
      if (trimmedDate) {
        if (ISO_DATE_REGEX.test(trimmedDate) && !Number.isNaN(Date.parse(trimmedDate))) {
          normalised.date = trimmedDate;
        } else {
          this.logger.warn('Ignoring invalid date filter', { date: trimmedDate });
        }
      }
    }

    return normalised;
  }

  async fetchPublishedEvents(filters: EventServiceFilters = {}): Promise<Event[]> {
    const normalisedFilters = this.normaliseFilters(filters);
    const query = this.supabase
      .from<EventRow>('events')
      .select(`
        *,
        ticket_types (*)
      `)
      .eq('status', 'PUBLISHED');

    if (normalisedFilters.search) {
      query.or(`title.ilike.%${normalisedFilters.search}%,description.ilike.%${normalisedFilters.search}%`);
    }

    if (normalisedFilters.location) {
      query.ilike('location', `%${normalisedFilters.location}%`);
    }

    if (normalisedFilters.date) {
      query.eq('date', normalisedFilters.date);
    }

    if (normalisedFilters.category) {
      query.contains('categories', [normalisedFilters.category]);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch events:', error);
      throw new Error('Failed to load events');
    }

    return (data ?? []).map((row) => ({
      ...row,
      ticket_types: row.ticket_types?.filter((ticket): ticket is TicketType => Boolean(ticket)) ?? [],
      categories: normaliseCategoryList(row.categories),
    }));
  }

  async fetchFilterMetadata(): Promise<{ locations: string[]; categories: string[] }> {
    const { data, error } = await this.supabase
      .from<EventFilterRow>('events')
      .select('location, categories')
      .eq('status', 'PUBLISHED');

    if (error) {
      this.logger.error('Failed to fetch event filter metadata:', error);
      throw new Error('Failed to load event filters');
    }

    const locations = new Set<string>();
    const categories = new Set<string>();

    for (const row of data ?? []) {
      const location = sanitiseFilterLabel(row.location);
      if (location) {
        locations.add(location);
      }

      for (const category of normaliseCategoryList(row.categories) ?? []) {
        categories.add(category);
      }
    }

    return {
      locations: Array.from(locations).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
      categories: Array.from(categories).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    };
  }

  subscribeToEventChanges(handler: () => void): RealtimeChannel {
    const channel = this.supabase
      .channel('events_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        handler,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          this.logger.error('Failed to subscribe to event changes');
        }
        if (status === 'TIMED_OUT') {
          this.logger.warn('Subscription to event changes timed out');
        }
      });

    return channel;
  }
}

export const eventService = new EventService();

