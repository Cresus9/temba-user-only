import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../types/event';
import { eventPublicPath } from '../utils/eventPath';
import { formatCalendarDate, formatEventTime } from '../utils/formatters';
import { eventPricePresentation } from '../utils/labels';
import { shortPlace } from '../utils/eventGeo';

interface EventCardProps extends Event {
  className?: string;
  priority?: boolean;
}

const EventCard = memo(({
  id,
  title,
  date,
  time,
  location,
  image_url,
  price,
  currency = 'XOF',
  city,
  timezone,
  is_permanent,
  slug,
  ticket_types,
  className = '',
}: EventCardProps) => {
  const tz = timezone ?? 'Africa/Ouagadougou';
  const isPermanent = is_permanent === true;
  const dateLabel = isPermanent
    ? 'Toute l’année'
    : date
      ? `${formatCalendarDate(date, { weekday: 'short', day: 'numeric', month: 'short' }, tz)}${formatEventTime(time) ? ` · ${formatEventTime(time)}` : ''}`
      : 'Date à confirmer';
  const place = shortPlace(location, city).label;
  const priceInfo = eventPricePresentation({ price, currency, ticket_types });

  return (
    <Link
      to={eventPublicPath({ id, slug })}
      className={`group block ${className}`}
      aria-label={`Voir ${title}`}
    >
      <article>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-surf">
          {image_url ? (
            <img
              src={image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : null}
          {priceInfo.tone === 'free' && (
            <span className="absolute left-2.5 top-2.5 inline-flex h-[22px] items-center rounded-[5px] bg-[#E6F4EE] px-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0B7A52]">
              Gratuit
            </span>
          )}
          {priceInfo.tone === 'soon' && (
            <span className="absolute left-2.5 top-2.5 inline-flex h-[22px] items-center rounded-[5px] bg-white/95 px-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-2">
              Bientôt
            </span>
          )}
        </div>
        <p className="mt-3 text-[13px] font-semibold text-brand">{dateLabel}</p>
        <h3 className="mt-0.5 line-clamp-2 font-display text-[17px] font-bold leading-snug tracking-[-0.015em] text-ink">
          {title}
        </h3>
        {place ? <p className="mt-0.5 truncate text-[14px] text-ink-3">{place}</p> : null}
        <p className={`mt-1.5 text-[14px] font-semibold tabular-nums ${priceInfo.tone === 'free' ? 'text-[#0B7A52]' : 'text-ink'}`}>
          {priceInfo.label}
        </p>
      </article>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
