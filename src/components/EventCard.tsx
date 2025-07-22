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
      <Card variant="interactive" padding="none" className="h-full transform transition-all duration-[var(--duration-normal)] hover:scale-[1.05] hover:shadow-2xl animate-float hover:animate-glow bg-gradient-to-br from-white via-orange-50 to-amber-50 border-2 border-transparent hover:border-orange-200">
        {/* Image Container */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-xl border-b-4 border-gradient-to-r from-orange-400 to-red-500">
          <Image
            src={image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-[var(--duration-slow)] filter group-hover:brightness-110 group-hover:contrast-110"
            fallbackSrc="https://images.unsplash.com/photo-1459749411175-04bf5292ceea"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-orange-900/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)] animate-gradient" />
          
          {/* Status Badge */}
          {status !== 'PUBLISHED' && (
            <div className="absolute top-4 right-4">
              <Badge variant="default" className="bg-gradient-to-r from-[var(--warning-500)] to-[var(--warning-600)] text-white shadow-lg backdrop-blur-sm">
                {status}
              </Badge>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {categories.slice(0, 2).map((category, index) => (
                <Badge
                  key={category}
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] text-white shadow-lg backdrop-blur-sm transform hover:scale-105 transition-transform"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {category}
                </Badge>
              ))}
              {categories.length > 2 && (
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] text-white shadow-lg backdrop-blur-sm"
                >
                  +{categories.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute bottom-4 right-4">
            <Badge variant="default" className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-2xl border-2 border-white/30 backdrop-blur-sm font-bold text-xl px-6 py-3 animate-pulse hover:animate-bounce transform hover:scale-110 transition-all">
              💰 {formatCurrency(price, currency)}
            </Badge>
          </div>

          {/* Availability Indicator Overlay */}
          {availabilityPercentage >= 80 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <Badge variant="error" className="bg-gradient-to-r from-[var(--error-500)] to-[var(--error-600)] text-white shadow-lg animate-pulse">
                🔥 Vente rapide
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 bg-gradient-to-br from-white via-white to-[var(--gray-50)] relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-50)]/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-[var(--gray-900)] mb-3 line-clamp-1 group-hover:text-[var(--primary-700)] transition-colors">
              {title}
            </h3>
            <p className="text-[var(--gray-600)] mb-5 line-clamp-2 leading-relaxed">{description}</p>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 text-[var(--gray-600)] group-hover:text-[var(--primary-600)] transition-colors">
                <div className="p-2 bg-[var(--primary-50)] rounded-lg group-hover:bg-[var(--primary-100)] transition-colors">
                  <Calendar className="h-4 w-4 text-[var(--primary-600)]" />
                </div>
                <span className="font-medium">{eventDate.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-[var(--gray-600)] group-hover:text-[var(--primary-600)] transition-colors">
                <div className="p-2 bg-[var(--primary-50)] rounded-lg group-hover:bg-[var(--primary-100)] transition-colors">
                  <Clock className="h-4 w-4 text-[var(--primary-600)]" />
                </div>
                <span className="font-medium">{time}</span>
              </div>
              <div className="flex items-center gap-3 text-[var(--gray-600)] group-hover:text-[var(--primary-600)] transition-colors">
                <div className="p-2 bg-[var(--primary-50)] rounded-lg group-hover:bg-[var(--primary-100)] transition-colors">
                  <MapPin className="h-4 w-4 text-[var(--primary-600)]" />
                </div>
                <span className="font-medium line-clamp-1">{location}</span>
              </div>
            </div>

            {/* Availability Indicator */}
            <div className="mb-6 p-4 bg-[var(--gray-50)] rounded-xl border border-[var(--gray-100)]">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--gray-700)] font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--primary-600)]" />
                  {tickets_sold} / {capacity} billets vendus
                </span>
                <span className="text-[var(--primary-600)] font-bold">
                  {Math.round(availabilityPercentage)}%
                </span>
              </div>
              <div className="h-3 bg-[var(--gray-200)] rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] rounded-full transition-all duration-[var(--duration-slow)] shadow-sm"
                  style={{ width: `${Math.min(availabilityPercentage, 100)}%` }}
                />
              </div>
            </div>

            <Button 
              variant="primary" 
              className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 shadow-2xl hover:shadow-orange-500/50 transform hover:scale-[1.05] transition-all duration-[var(--duration-normal)] font-bold text-xl py-4 animate-gradient border-2 border-white/20 text-white hover:animate-pulse"
            >
              {isUpcoming ? '🎫✨ OBTENIR DES BILLETS ✨🎫' : '👁️🔥 VOIR LES DÉTAILS 🔥👁️'}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
