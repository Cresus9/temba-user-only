import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase-client';
import { Event } from '../types/event';
import toast from 'react-hot-toast';

interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  getEvent: (id: string) => Event | undefined;
  featuredEvents: Event[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const activeRequestId = useRef(0);

  const fetchEvents = useCallback(async () => {
    const requestId = ++activeRequestId.current;
    try {
      if (!isMountedRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      // Fetch all published events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (*)
        `)
        .eq('status', 'PUBLISHED')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      if (!isMountedRef.current || requestId !== activeRequestId.current) {
        return;
      }

      const fetchedEvents = eventsData || [];
      setEvents(fetchedEvents);
      setFeaturedEvents(fetchedEvents.filter(event => Boolean(event.featured)));
    } catch (err: any) {
      console.error('Error fetching events:', err);
      if (!isMountedRef.current || requestId !== activeRequestId.current) {
        return;
      }

      setError('Failed to load events');
      if (navigator.onLine) {
        toast.error('Failed to load events. Please try again later.');
      }
    } finally {
      if (isMountedRef.current && requestId === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  const getEvent = (id: string) => {
    return events.find(event => event.id === id);
  };

  // Subscribe to realtime changes
  useEffect(() => {
    isMountedRef.current = true;
    const eventsSubscription = supabase
      .channel('events_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          // Refetch events when changes occur
          fetchEvents();
        }
      )
      .subscribe();

    // Initial fetch
    fetchEvents();

    // Cleanup subscription
    return () => {
      isMountedRef.current = false;
      void eventsSubscription.unsubscribe();
      if (typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(eventsSubscription);
      }
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
        featuredEvents
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