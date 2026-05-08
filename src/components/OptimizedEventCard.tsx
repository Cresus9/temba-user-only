import React from 'react';
import PosterMedia from './common/PosterMedia';
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
      return { text: 'Épuisé', cls: 'bg-ink text-paper' };
    } else if (soldPercentage >= 90) {
      return { text: 'Derniers billets', cls: 'bg-accent text-paper' };
    } else if (soldPercentage >= 75) {
      return { text: 'Vente rapide', cls: 'bg-accent-50 text-accent-700 border border-accent-100' };
    }

    return null;
  };

  const availability = getAvailabilityStatus();

  return (
    <div
      className={`group bg-paper rounded-xl2 border border-line hover:border-brand/40 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {/* Image — full poster, blurred backdrop fills the frame */}
      <PosterMedia
        src={event.image_url}
        alt={event.title}
        aspect="aspect-square"
        width={500}
        height={500}
        quality={80}
        priority={priority}
        className="group-hover:[&_img]:scale-[1.03] [&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out"
      >
        {availability && (
          <div className={`absolute bottom-2.5 right-2.5 ${availability.cls} px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide z-10 shadow-card`}>
            {availability.text}
          </div>
        )}
      </PosterMedia>

      {/* Content — compact */}
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-accent mb-1">
          {formatDate(event.date)}
        </p>
        <h3
          className="text-[13px] font-bold text-ink mb-1.5 line-clamp-2 leading-snug tracking-tight"
          style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
        >
          {event.title}
        </h3>

        <div className="flex items-center gap-1 text-[11px] text-ink-mute mb-2.5">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{event.location}</span>
        </div>

        <footer className="flex items-center justify-between pt-2.5 border-t border-line">
          <p className="text-[13px] font-bold text-ink leading-none tracking-tight">
            {formatPrice(event.price, event.currency)}
          </p>
          <span className="text-[12px] font-semibold text-ink group-hover:text-brand transition-colors inline-flex items-center gap-0.5">
            Réserver
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
