import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { Event } from '../../types/event';
import { formatCurrency } from '../../utils/formatters';
import Image from '../common/Image';

interface UpcomingEventsProps {
  limit?: number;
  category?: string;
}

export default function UpcomingEvents({ limit = 6, category }: UpcomingEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [limit, category]);

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      console.log('🔍 [UpcomingEvents] Fetching upcoming events...', { limit, category });
      
      let query = supabase
        .from('events')
        .select(`
          *,
          ticket_types (*)
        `)
        .eq('status', 'PUBLISHED')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit);

      // Filter by category if provided
      if (category) {
        // This will be filtered client-side since categories might be in different fields
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [UpcomingEvents] Error:', error);
        throw error;
      }
      
      let filteredData = data || [];
      
      // Client-side category filter if needed
      if (category) {
        filteredData = filteredData.filter(event => {
          const eventCategories = event.categories || [];
          const categoryRelations = (event as any).event_category_relations?.map(
            (rel: any) => rel.categories?.name
          ).filter(Boolean) || [];
          return eventCategories.includes(category) || categoryRelations.includes(category);
        });
      }
      
      console.log('✅ [UpcomingEvents] Loaded:', filteredData.length, 'events');
      setEvents(filteredData);
    } catch (error) {
      console.error('❌ [UpcomingEvents] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">ÉVÉNEMENTS À VENIR</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    console.log('⚠️ No upcoming events found');
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {category ? `${category.toUpperCase()} À VENIR` : 'ÉVÉNEMENTS À VENIR'}
          </h2>
        </div>
        <p className="text-gray-600 text-sm">Aucun événement à venir pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {category ? `${category.toUpperCase()} À VENIR` : 'ÉVÉNEMENTS À VENIR'}
        </h2>
        <Link
          to={category ? `/categories/${category}` : '/events'}
          className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1"
        >
          Voir tout
          <span>&gt;</span>
        </Link>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <UpcomingEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

interface UpcomingEventCardProps {
  event: Event;
}

function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <Link
      to={`/events/${event.id}`}
      className="flex gap-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 group"
    >
      {/* Event Image */}
      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={event.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea'}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          width={96}
          height={96}
        />
      </div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <div className="text-orange-500 text-sm font-medium mb-1">
          {formattedDate}, {event.time}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="text-gray-600 text-sm">
          {formatCurrency(event.price, event.currency)}
        </div>
      </div>

      {/* Buy Button */}
      <div className="flex items-center flex-shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `/events/${event.id}`;
          }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm whitespace-nowrap"
        >
          Acheter
        </button>
      </div>
    </Link>
  );
}

