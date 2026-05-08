import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Tag } from 'lucide-react';
import { Event } from '../types/event';
import { formatCurrency } from '../utils/formatters';
import PosterMedia from './common/PosterMedia';

interface EventCardProps extends Event {
  className?: string;
  priority?: boolean;
}

const EventCard = memo(({
  id,
  title,
  description,
  date,
  time,
  location,
  image_url,
  price,
  currency = 'XOF',
  capacity,
  tickets_sold,
  categories = [],
  status,
  className = '',
  priority = false
}: EventCardProps) => {
  const availabilityPercentage = (tickets_sold / capacity) * 100;
  const eventDate = new Date(date);
  const isUpcoming = eventDate > new Date();

  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <Link
      to={`/events/${id}`}
      className={`group block h-full bg-paper rounded-xl2 border border-line hover:border-brand/40 shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 ${className}`}
      aria-label={`Voir les détails de l'événement ${title}`}
    >
      <article className="flex flex-col h-full">
        {/* Image — full poster, blurred backdrop fills the frame */}
        <div className="relative flex-shrink-0">
          <PosterMedia
            src={image_url}
            alt={title}
            aspect="aspect-square"
            fallbackSrc="https://images.unsplash.com/photo-1459749411175-04bf5292ceea"
            width={500}
            height={500}
            quality={85}
            priority={priority}
            className="group-hover:[&_img]:scale-[1.03] [&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out"
          >
            {/* Status — only when non-published */}
            {status !== 'PUBLISHED' && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-ink/80 text-paper z-10 backdrop-blur-sm">
                {status}
              </div>
            )}

            {/* Single category pill — bottom right, brand orange */}
            {categories.length > 0 && (
              <div className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full bg-accent text-paper text-[11px] font-semibold shadow-card">
                <Tag className="h-2.5 w-2.5" />
                <span className="leading-none">{categories[0]}</span>
              </div>
            )}
          </PosterMedia>
        </div>

        {/* Content — compact */}
        <div className="flex flex-col flex-1 p-3 min-h-0">
          <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-accent mb-1">
            {formattedDate} · {time}
          </p>

          <h3
            className="text-[13px] font-bold text-ink mb-1.5 line-clamp-2 leading-snug tracking-tight"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            {title}
          </h3>

          <div className="flex items-center gap-1 text-[11px] text-ink-mute mb-2.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {/* Availability — only when 80%+ sold */}
          {availabilityPercentage >= 80 && (
            <div className="mb-2.5 flex-shrink-0">
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-ink-mute flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {tickets_sold}/{capacity}
                </span>
                <span className="text-accent font-semibold">Vente rapide</span>
              </div>
              <div className="h-0.5 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(availabilityPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer — price + CTA */}
          <footer className="mt-auto flex-shrink-0 flex items-center justify-between pt-2.5 border-t border-line">
            <p className="text-[13px] font-bold text-ink leading-none tracking-tight">
              {formatCurrency(price, currency)}
            </p>
            <span className="text-[12px] font-semibold text-ink group-hover:text-brand transition-colors inline-flex items-center gap-0.5">
              {isUpcoming ? 'Réserver' : 'Détails'}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </footer>
        </div>
      </article>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;