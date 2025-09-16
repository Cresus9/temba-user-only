import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Event } from '../types/event';
import toast from 'react-hot-toast';
import { EventService, eventService as defaultEventService } from '../services/eventService';

interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  getEvent: (id: string) => Event | undefined;
  featuredEvents: Event[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  children: React.ReactNode;
  service?: EventService;
}

export function EventProvider({ children, service }: EventProviderProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventService = useMemo(() => service ?? defaultEventService, [service]);
  const isMountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);
  const lastToastAtRef = useRef<number | null>(null);
  const latestRequestRef = useRef(0);

  const dedupeEvents = useCallback((list: Event[]): Event[] => {
    const seen = new Set<string>();
    return list.filter((event) => {
      if (!event.id) {
        return false;
      }
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    });
  }, []);

  const updateEvents = useCallback((list: Event[]) => {
    const deduped = dedupeEvents(list);
    setEvents(deduped);
    setFeaturedEvents(deduped.filter((event) => event.featured));
  }, [dedupeEvents]);

  const loadEvents = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;
      const shouldShowLoading = options.showLoading ?? !hasLoadedOnceRef.current;

      if (shouldShowLoading) {
        setLoading(true);
      }

      try {
        setError(null);
        const list = await eventService.fetchPublishedEvents();
        if (!isMountedRef.current || latestRequestRef.current !== requestId) {
          return;
        }
        updateEvents(list);
        hasLoadedOnceRef.current = true;
        lastToastAtRef.current = null;
      } catch (err) {
        if (!isMountedRef.current || latestRequestRef.current !== requestId) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load events';
        setError(message);

        const now = Date.now();
        const online = typeof navigator !== 'undefined' && navigator.onLine;
        if (online && (!lastToastAtRef.current || now - lastToastAtRef.current > 5000)) {
          toast.error('Failed to load events. Please try again later.');
          lastToastAtRef.current = now;
        }
      } finally {
        if (shouldShowLoading && isMountedRef.current && latestRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [eventService, updateEvents],
  );

  const fetchEvents = useCallback(() => loadEvents({ showLoading: true }), [loadEvents]);

  const getEvent = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events],
  );

  useEffect(() => {
    isMountedRef.current = true;

    const subscription = eventService.subscribeToEventChanges(() => {
      void loadEvents({ showLoading: false });
    });

    void loadEvents({ showLoading: true });

    return () => {
      isMountedRef.current = false;
      void subscription.unsubscribe();
    };
  }, [eventService, loadEvents]);

  const contextValue = useMemo(
    () => ({
      events,
      loading,
      error,
      fetchEvents,
      getEvent,
      featuredEvents,
    }),
    [events, loading, error, fetchEvents, getEvent, featuredEvents],
  );

  return (
    <EventContext.Provider value={contextValue}>
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