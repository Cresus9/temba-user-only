import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { Event } from '../../types/event';
import { formatCurrency } from '../../utils/formatters';

export default function FeaturedEvents() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  const fetchFeaturedEvents = async () => {
    try {
      setLoading(true);
      console.log('🔍 [FeaturedEvents] Fetching featured events...');
      
      // Get featured events (top 4 by tickets_sold or date)
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (*)
        `)
        .eq('status', 'PUBLISHED')
        .order('tickets_sold', { ascending: false })
        .order('date', { ascending: true })
        .limit(4);

      if (error) {
        console.error('❌ [FeaturedEvents] Error:', error);
        throw error;
      }
      
      console.log('✅ [FeaturedEvents] Loaded:', data?.length || 0, 'events');
      setFeaturedEvents(data || []);
    } catch (error) {
      console.error('❌ [FeaturedEvents] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ÉVÉNEMENTS EN VEDETTE</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-full bg-gray-200 rounded-xl aspect-[4/3] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (featuredEvents.length === 0) {
    console.log('⚠️ No featured events found');
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ÉVÉNEMENTS EN VEDETTE</h2>
        <p className="text-gray-600 text-sm">Aucun événement en vedette pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">ÉVÉNEMENTS EN VEDETTE</h2>
      <FeaturedEventsCarousel events={featuredEvents} />
    </section>
  );
}

interface FeaturedEventsCarouselProps {
  events: Event[];
}

function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const clampedIndex = Math.max(0, Math.min(index, events.length - 1));
    setCurrentIndex(clampedIndex);
    
    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth;
    container.scrollTo({
      left: clampedIndex * cardWidth,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            className="flex-shrink-0 w-full snap-start"
            style={{ scrollSnapAlign: 'start' }}
          >
            <FeaturedEventCard event={event} />
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      {events.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-indigo-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FeaturedEventCardProps {
  event: Event;
}

function FeaturedEventCard({ event }: FeaturedEventCardProps) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={event.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea'}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Content Overlay - Mobile Style */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="text-orange-500 text-sm font-medium mb-2">
            {formattedDate}, {event.time}
          </div>
          <h3 className="text-xl md:text-2xl font-bold mb-2 line-clamp-2">
            {event.title}
          </h3>
          <p className="text-gray-300 text-sm mb-2 line-clamp-1">
            {event.description || 'Lorem Ipsum'}
          </p>
          <div className="text-gray-300 text-sm mb-4">
            {event.location}
          </div>
          
          {/* Book Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/events/${event.id}`;
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm"
          >
            Book tickets
          </button>
        </div>
      </div>
    </Link>
  );
}

