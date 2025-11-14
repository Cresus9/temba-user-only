import React, { useEffect } from 'react';
import EventImageWithOptimization from './EventImageWithOptimization';
import { imagePreloader } from '../utils/imagePreloader';

interface Event {
  id: string;
  title: string;
  image_url: string;
  date: string;
  location: string;
  price: number;
  currency: string;
  tickets_sold?: number;
  capacity?: number;
}

interface OptimizedEventCardProps {
  event: Event;
  priority?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function OptimizedEventCard({ 
  event, 
  priority = false, 
  className = '',
  onClick 
}: OptimizedEventCardProps) {
  
  // Preload detail image when card is hovered (for better UX)
  const handleMouseEnter = () => {
    if (event.image_url) {
      imagePreloader.preloadImage(event.image_url, {
        width: 800,
        height: 600,
        quality: 85
      }).catch(error => {
        console.warn('Failed to preload detail image:', error);
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price);
  };

  const getAvailabilityStatus = () => {
    if (!event.capacity || !event.tickets_sold) return null;
    
    const soldPercentage = (event.tickets_sold / event.capacity) * 100;
    
    if (soldPercentage >= 100) {
      return { text: 'Épuisé', color: 'bg-red-500' };
    } else if (soldPercentage >= 90) {
      return { text: 'Derniers billets', color: 'bg-orange-500' };
    } else if (soldPercentage >= 75) {
      return { text: 'Vente rapide', color: 'bg-yellow-500' };
    }
    
    return null;
  };

  const availability = getAvailabilityStatus();

  return (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {/* Image with optimization */}
      <div className="relative">
        <EventImageWithOptimization
          src={event.image_url}
          alt={event.title}
          width={400}
          height={300}
          quality={80}
          priority={priority}
          className="w-full h-48 object-cover"
        />
        
        {/* Availability badge */}
        {availability && (
          <div className={`absolute top-2 right-2 ${availability.color} text-white px-2 py-1 rounded-full text-xs font-semibold`}>
            {availability.text}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {event.title}
        </h3>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(event.date)}</span>
          </div>
          
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>

          {/* Ticket availability - Only show if 80%+ sold */}
          {event.capacity && event.tickets_sold !== undefined && (event.tickets_sold / event.capacity) >= 0.8 && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span>{event.tickets_sold} / {event.capacity}</span>
            </div>
          )}
        </div>

        {/* Price and action */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-lg font-bold text-indigo-600">
            {formatPrice(event.price, event.currency)}
          </div>
          
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
            Obtenir des billets
          </button>
        </div>
      </div>
    </div>
  );
}
