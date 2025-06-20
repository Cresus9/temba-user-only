import React from 'react';
import { Loader } from 'lucide-react';
import EventCard from './EventCard';
import { useEvents } from '../context/EventContext';

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
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl aspect-[16/9] mb-4" />
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
        >
          <Loader className="h-5 w-5" />
          Try Again
        </button>
      </div>
    );
  }

  if (!filteredEvents.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
        <p className="text-gray-600">Check back later for upcoming events.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredEvents.map((event) => (
        <EventCard key={event.id} {...event} />
      ))}
    </div>
  );
}