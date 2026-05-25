import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import { Event } from '../types/event';
import { sortEventsByCountryPriority } from '../utils/eventGeo';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'temba_active_country';

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
  /** Events filtered by activeCountry (when set). Same as `events` when null. */
  filteredEvents: Event[];
  /** ISO codes of countries that have at least one published event. */
  activeCountries: string[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCountries, setActiveCountries] = useState<string[]>([]);

  // Restore persisted country on mount
  const [activeCountry, setActiveCountryState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  });

  const setActiveCountry = (code: string | null) => {
    setActiveCountryState(code);
    try {
      if (code) localStorage.setItem(STORAGE_KEY, code);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable in some browsers
    }
  };

  // When a country is selected, put its events first — but keep ALL events visible
  const filteredEvents = sortEventsByCountryPriority(events, activeCountry);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`*, ticket_types (*)`)
        .eq('status', 'PUBLISHED')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      setEvents(eventsData || []);
      setFeaturedEvents(eventsData || []);

      // Derive which countries have events and expose for the country picker
      const codes = [...new Set((eventsData || []).map(e => e.country_code ?? 'BF'))];
      setActiveCountries(codes);

      // If the persisted country no longer has any events, clear it
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !codes.includes(stored)) {
        setActiveCountry(null);
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
      if (navigator.onLine) {
        toast.error('Failed to load events. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getEvent = (id: string) => events.find(event => event.id === id);

  useEffect(() => {
    const eventsSubscription = supabase
      .channel('events_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    fetchEvents();

    return () => { eventsSubscription.unsubscribe(); };
  }, []);

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
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
