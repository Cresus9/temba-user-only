import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { Event } from '../types/event';
import { formatCurrency } from '../utils/formatters';
import Image from './common/Image';
import { Card, Button, Badge } from './ui';

interface EventCardProps extends Event {
  className?: string;
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
  className = ''
}: EventCardProps) => {
  const availabilityPercentage = (tickets_sold / capacity) * 100;
  const eventDate = new Date(date);
  const isUpcoming = eventDate > new Date();

  return (
    <Link 
      to={`/events/${id}`}
      className={`group block ${className}`}
    >
      <Card variant="interactive" padding="none" className="h-full">
        {/* Image Container */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[var(--duration-normal)]"
            fallbackSrc="https://images.unsplash.com/photo-1459749411175-04bf5292ceea"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/50 to-transparent" />
          
          {/* Status Badge */}
          {status !== 'PUBLISHED' && (
            <div className="absolute top-4 right-4">
              <Badge variant="default" className="bg-black/50 text-white">
                {status}
              </Badge>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {categories.slice(0, 2).map((category) => (
                <Badge
                  key={category}
                  variant="default"
                  size="sm"
                  className="bg-black/50 text-white"
                >
                  {category}
                </Badge>
              ))}
              {categories.length > 2 && (
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-black/50 text-white"
                >
                  +{categories.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute bottom-4 right-4">
            <Badge variant="default" className="bg-white text-[var(--gray-900)]">
              {formatCurrency(price, currency)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-[var(--gray-900)] mb-2 line-clamp-1">
            {title}
          </h3>
          <p className="text-[var(--gray-600)] mb-4 line-clamp-2">{description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-[var(--gray-600)]">
              <Calendar className="h-4 w-4" />
              <span>{eventDate.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--gray-600)]">
              <Clock className="h-4 w-4" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--gray-600)]">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          </div>

          {/* Availability Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-[var(--gray-600)]">
                <Users className="h-4 w-4 inline mr-1" />
                {tickets_sold} / {capacity} billets vendus
              </span>
              {availabilityPercentage >= 80 && (
                <Badge variant="error" size="sm">Vente rapide</Badge>
              )}
            </div>
            <div className="h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary-600)] transition-all duration-[var(--duration-normal)]"
                style={{ width: `${Math.min(availabilityPercentage, 100)}%` }}
              />
            </div>
          </div>

          <Button variant="primary" className="w-full">
            {isUpcoming ? 'Obtenir des billets' : 'Voir les détails'}
          </Button>
        </div>
      </Card>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
