import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { Event } from '../../types/event';

interface VenueData {
  name: string;
  eventCount: number;
  nextEvent: Event | null;
}

export default function PopularVenues() {
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularVenues();
  }, []);

  const fetchPopularVenues = async () => {
    try {
      setLoading(true);
      
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'PUBLISHED')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const locationMap = new Map<string, Event[]>();
      
      events?.forEach((event: Event) => {
        if (event.location) {
          const normalizedLocation = normalizeLocation(event.location);
          const existing = locationMap.get(normalizedLocation) || [];
          locationMap.set(normalizedLocation, [...existing, event]);
        }
      });

      const venueData: VenueData[] = Array.from(locationMap.entries())
        .map(([name, locationEvents]) => ({
          name,
          eventCount: locationEvents.length,
          nextEvent: locationEvents[0] || null,
        }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 6);

      setVenues(venueData);
    } catch (error) {
      console.error('Error fetching popular venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeLocation = (location: string): string => {
    const parts = location.split(/[,–-]/);
    return parts[0].trim();
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-44 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (venues.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Lieux Populaires
          </h2>
        </div>
        <Link
          to="/events"
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors"
        >
          Voir tous les lieux
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {venues.map((venue, index) => (
          <VenueCard key={venue.name} venue={venue} index={index} />
        ))}
      </div>
    </section>
  );
}

interface VenueCardProps {
  venue: VenueData;
  index: number;
}

function VenueCard({ venue, index }: VenueCardProps) {
  // Alternate gradient directions for visual variety
  const gradients = [
    'from-indigo-500 via-indigo-600 to-purple-600',
    'from-purple-500 via-purple-600 to-indigo-600',
    'from-indigo-600 via-purple-500 to-purple-600',
    'from-purple-600 via-indigo-500 to-indigo-600',
    'from-indigo-500 to-purple-500',
    'from-purple-500 to-indigo-500',
  ];
  
  const gradient = gradients[index % gradients.length];

  return (
    <Link
      to={`/events?location=${encodeURIComponent(venue.name)}`}
      className="group block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Gradient Header */}
      <div className={`relative h-24 bg-gradient-to-br ${gradient} p-4 overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
        <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/10" />
        
        {/* Icon */}
        <div className="relative w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <MapPin className="h-5 w-5 text-white" />
        </div>
        
        {/* Hover arrow indicator */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ArrowRight className="h-4 w-4 text-white/80" />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        {/* Venue Name */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
          {venue.name}
        </h3>
        
        {/* Event Count Badge */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs font-medium">
            {venue.eventCount} événement{venue.eventCount > 1 ? 's' : ''}
          </span>
        </div>
        
        {/* Next Event Preview */}
        {venue.nextEvent && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-start gap-1.5">
              <Ticket className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-gray-500 line-clamp-1 leading-tight">
                {venue.nextEvent.title}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
