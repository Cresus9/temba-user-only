import React, { useState, useRef, useEffect } from 'react';
import { Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import EventCard from './EventCard';
import { useEvents } from '../context/EventContext';

interface EventCardListProps {
  featured?: boolean;
  limit?: number;
  showNavigation?: boolean;
}

export default function EventCardList({ 
  featured = false, 
  limit, 
  showNavigation = true 
}: EventCardListProps) {
  const { events, featuredEvents, loading, error } = useEvents();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [eventsPerView, setEventsPerView] = useState(3);

  // Filter events based on props
  const displayEvents = featured ? featuredEvents : events;
  const filteredEvents = limit ? displayEvents.slice(0, limit) : displayEvents;
  
  // Calculate how many events to show based on screen size
  const getEventsPerView = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 1024) return 2; // mobile and tablet: 2 events
    return 3; // desktop: 3 events
  };
  
  // Update eventsPerView on window resize
  useEffect(() => {
    const updateEventsPerView = () => {
      const newEventsPerView = getEventsPerView();
      setEventsPerView(newEventsPerView);
    };
    
    updateEventsPerView();
    window.addEventListener('resize', updateEventsPerView);
    
    return () => window.removeEventListener('resize', updateEventsPerView);
  }, []);

  // Calculate minWidth based on eventsPerView
  const getMinWidth = () => {
    if (eventsPerView === 2) return 'calc(50% - 0.5rem)';
    return 'calc(33.333% - 1rem)';
  };
  
  const maxIndex = Math.max(0, filteredEvents.length - eventsPerView);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(clampedIndex);
    
    const container = scrollContainerRef.current;
    const cardWidth = container.scrollWidth / filteredEvents.length;
    const scrollPosition = clampedIndex * cardWidth;
    
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  const handlePrevious = () => {
    scrollToIndex(currentIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(currentIndex + 1);
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  if (loading) {
    return (
      <div className="relative">
        <div className="flex gap-6 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-full sm:w-1/3 animate-pulse">
              <div className="bg-gray-200 rounded-xl aspect-[16/9] mb-4" />
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
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
    <div className="relative group">
      {/* Navigation Arrows */}
      {showNavigation && filteredEvents.length > eventsPerView && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all duration-200 ${
              canGoPrevious 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:shadow-xl opacity-90 hover:opacity-100' 
                : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed opacity-50'
            }`}
            aria-label="Événements précédents"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all duration-200 ${
              canGoNext 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:shadow-xl opacity-90 hover:opacity-100' 
                : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed opacity-50'
            }`}
            aria-label="Événements suivants"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Events Container */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredEvents.map((event, index) => (
          <div 
            key={event.id} 
            className="flex-shrink-0 w-1/2 sm:w-1/2 lg:w-1/3 snap-start"
            style={{ minWidth: getMinWidth() }}
          >
            <EventCard {...event} />
          </div>
        ))}
      </div>

      {/* Progress Indicators */}
      {showNavigation && filteredEvents.length > eventsPerView && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: Math.ceil(filteredEvents.length / eventsPerView) }, (_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i * eventsPerView)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                Math.floor(currentIndex / eventsPerView) === i
                  ? 'bg-indigo-600 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Aller à la page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}