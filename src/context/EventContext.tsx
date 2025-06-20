import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const fetchEvents = async () => {
    try {
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

      // Set both events and featured events to the same data
      setEvents(eventsData || []);
      setFeaturedEvents(eventsData || []);
       // Log each event's ID
    eventsData?.forEach((event) => {
      console.log('Event TITLE:', event.title);
      console.log('Event ID:', event.id);
    });

      // Log the results for debugging
      console.log('Published events:', eventsData?.length || 0);
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

  const getEvent = (id: string) => {
    return events.find(event => event.id === id);
  };

  // Subscribe to realtime changes
  useEffect(() => {
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
      eventsSubscription.unsubscribe();
    };
  }, []);

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