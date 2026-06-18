import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase-client';
import { Event } from '../types/event';
import { sortEventsByCountryPriority } from '../utils/eventGeo';
import { queryCache, TTL } from '../utils/queryCache';
import toast from 'react-hot-toast';

// Edge Function URL — set VITE_SUPABASE_URL in .env.local
const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL ?? '';
const GET_EVENTS_URL  = `${SUPABASE_URL}/functions/v1/get-events`;
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Fetch published events via the get-events Edge Function (Redis-first).
 * Falls back to a direct Supabase query if the Edge Function is unreachable.
 */
async function fetchEventsFromEdge(): Promise<Event[]> {
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL not set');

  const res = await fetch(GET_EVENTS_URL, {
    headers: {
      'apikey':        SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
  });

  if (!res.ok) throw new Error(`get-events HTTP ${res.status}`);
  return res.json() as Promise<Event[]>;
}

const STORAGE_KEY = 'temba_active_country';
const CACHE_KEY   = 'events:all';

interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  getEvent: (id: string) => Event | undefined;
  featuredEvents: Event[];
  /** Currently active country filter. null = show all countries. */
  activeCountry: string | null;
  setActiveCountry: (code: string | null) => void;
  /** Events sorted by activeCountry (when set). Same as `events` when null. */
  filteredEvents: Event[];
  /** ISO codes of countries that have at least one published event. */
  activeCountries: string[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents]               = useState<Event[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [activeCountries, setActiveCountries] = useState<string[]>([]);

  // Debounce ref for realtime-triggered refetches
  const realtimeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore persisted country on mount
  const [activeCountry, setActiveCountryState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? null; }
    catch { return null; }
  });

  const setActiveCountry = (code: string | null) => {
    setActiveCountryState(code);
    try {
      if (code) localStorage.setItem(STORAGE_KEY, code);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* localStorage may be unavailable */ }
  };

  // Put selected-country events first — keep ALL events visible
  const filteredEvents = sortEventsByCountryPriority(events, activeCountry);

  const applyData = useCallback((eventsData: Event[]) => {
    setEvents(eventsData);
    setFeaturedEvents(eventsData.filter(e => e.featured === true));

    const codes = [...new Set(eventsData.map(e => e.country_code ?? 'BF'))];
    setActiveCountries(codes);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !codes.includes(stored)) setActiveCountry(null);
    } catch { /* ignore */ }
  }, []);

  const fetchEvents = useCallback(async (force = false) => {
    // 1. Serve from in-memory cache when still fresh (unless forced)
    if (!force) {
      const cached = queryCache.peek<Event[]>(CACHE_KEY);
      if (cached) {
        applyData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      let eventsData: Event[] = [];

      // 2. Try Edge Function (Redis-first) — fastest path
      try {
        eventsData = await fetchEventsFromEdge();
        console.debug(`[EventContext] loaded ${eventsData.length} events via Edge Function`);
      } catch (edgeErr) {
        // 3. Edge Function unavailable — fall back to direct Supabase query
        console.warn('[EventContext] Edge Function failed, falling back to Supabase:', edgeErr);

        const { data, error: dbErr } = await supabase
          .from('events')
          .select(`*, ticket_types (*)`)
          .eq('status', 'PUBLISHED')
          .order('date', { ascending: true });

        if (dbErr) throw dbErr;
        eventsData = data ?? [];
        console.debug(`[EventContext] loaded ${eventsData.length} events via direct Supabase`);
      }

      // 4. Store in in-memory cache (browser-level)
      queryCache.set(CACHE_KEY, eventsData, TTL.EVENTS);
      applyData(eventsData);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
      if (navigator.onLine) toast.error('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  const getEvent = (id: string) => events.find(e => e.id === id);

  useEffect(() => {
    // Initial load — serve cache immediately, re-fetch in bg if stale
    fetchEvents();

    // Realtime: debounce re-fetches so rapid admin saves don't flood the DB.
    // We also invalidate the cache so the next fetch actually hits Supabase.
    const subscription = supabase
      .channel('events_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current);
        realtimeDebounce.current = setTimeout(() => {
          queryCache.invalidate(CACHE_KEY);
          fetchEvents(true);
        }, 3000); // Wait 3 s before re-fetching after a DB change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (realtimeDebounce.current) clearTimeout(realtimeDebounce.current);
    };
  }, [fetchEvents]);

  return (
    <EventContext.Provider
      value={{
        events,
        loading,
        error,
        fetchEvents,
        getEvent,
        featuredEvents,
        activeCountry,
        setActiveCountry,
        filteredEvents,
        activeCountries,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (context === undefined) throw new Error('useEvents must be used within an EventProvider');
  return context;
}
