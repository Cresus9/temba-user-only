import React from 'react';
import { Loader } from 'lucide-react';
import EventCard from './EventCard';
import { useEvents } from '../context/EventContext';
import { Button } from './ui';

interface EventCardListProps {
  featured?: boolean;
  limit?: number;
}

export default function EventCardList({ featured = false, limit }: EventCardListProps) {
  const { events, featuredEvents, loading, error } = useEvents();

  // Filter events based on props
  const displayEvents = featured ? featuredEvents : events;
  const filteredEvents = limit ? displayEvents.slice(0, limit) : displayEvents;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(limit || 6)].map((_, i) => (
          <div 
            key={i} 
            className="animate-pulse"
            style={{ 
              animationDelay: `${i * 100}ms`,
              animationDuration: '1.5s'
            }}
          >
            <div className="bg-[var(--gray-200)] rounded-xl aspect-[16/9] mb-4" />
            <div className="space-y-3 p-4">
              <div className="h-6 bg-[var(--gray-200)] rounded w-3/4" />
              <div className="h-4 bg-[var(--gray-200)] rounded w-1/2" />
              <div className="h-4 bg-[var(--gray-200)] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--error-600)] mb-4">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="primary"
          className="flex items-center gap-2 mx-auto"
        >
          <Loader className="h-5 w-5" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!filteredEvents.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">Aucun événement trouvé</h3>
        <p className="text-[var(--gray-600)]">Revenez plus tard pour les prochains événements.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredEvents.map((event, index) => (
        <div
          key={event.id}
          className="animate-fade-in-up"
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'both'
          }}
        >
          <EventCard {...event} />
        </div>
      ))}
    </div>
  );
}
