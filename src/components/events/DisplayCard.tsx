import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';
import { eventPublicPath } from '../../utils/eventPath';
import { eventPricePresentation } from '../../utils/labels';
import { eventBadges, placeLabel, whenLabel, type EventBadge, type ScheduleSpan, spanFor } from '../../utils/eventDisplay';
import { ATTRACTION_TYPE_LABELS } from '../../services/permanentVenueService';
import FlyerFrame from './FlyerFrame';

function Badge({ badge }: { badge: EventBadge }) {
  const cls = badge.kind === 'featured'
    ? 'bg-[#F6B84A] text-ink'
    : badge.kind === 'dates'
      ? 'bg-[rgba(3,6,30,0.72)] text-white'
      : badge.kind === 'past'
        ? 'bg-[#5E6178] text-white'
        : badge.kind === 'free'
          ? 'bg-[#0B7A52] text-white'
          : 'bg-white text-ink';
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-semibold shadow-sm ${cls}`}>
      {badge.kind === 'live' ? <i className="h-1.5 w-1.5 rounded-full bg-[#16A34A] shadow-[0_0_0_3px_rgba(22,163,74,0.22)]" /> : null}
      {badge.label}
    </span>
  );
}

export default function DisplayCard({
  event,
  span,
  width,
  variant = 'rail',
}: {
  event: Event;
  span?: ScheduleSpan;
  width?: number;
  variant?: 'rail' | 'compact' | 'attraction';
}) {
  const schedule = span ?? spanFor(event);
  const badges = eventBadges(event, schedule);
  const price = eventPricePresentation(event);
  const when = whenLabel(event, schedule);
  const place = placeLabel(event);

  if (variant === 'compact') {
    return (
      <Link to={eventPublicPath(event)} className="flex items-center gap-3 border-t border-line py-3">
        <div className="w-[52px] shrink-0">
          <FlyerFrame src={event.image_url} alt="" past={badges.some((badge) => badge.kind === 'past')} />
        </div>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[12.5px] font-semibold ${badges.some((b) => b.kind === 'live') ? 'text-[#0B7A52]' : 'text-brand'}`}>{when}</span>
          <span className="mt-0.5 block truncate font-display text-[15px] font-bold">{event.title}</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-3">{place}</span>
        </span>
        <span className={`shrink-0 text-[14px] font-semibold ${price.tone === 'free' ? 'text-[#0B7A52]' : ''}`}>{price.label}</span>
      </Link>
    );
  }

  const attraction = variant === 'attraction';
  const typeLabel = event.attraction_type ? ATTRACTION_TYPE_LABELS[event.attraction_type] : '';

  return (
    <Link
      to={eventPublicPath(event)}
      className="block shrink-0 snap-start"
      style={width ? { width } : undefined}
    >
      <div className="relative">
        <FlyerFrame
          src={event.image_url}
          alt={event.title}
          ratio={attraction ? '16/9' : '4/5'}
          past={badges.some((badge) => badge.kind === 'past')}
        />
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {badges.map((badge) => <Badge key={badge.kind} badge={badge} />)}
            {attraction && typeLabel ? <Badge badge={{ kind: 'permanent', label: typeLabel }} /> : null}
          </div>
        )}
      </div>
      <p className={`mt-3 truncate text-[13px] font-semibold ${badges.some((b) => b.kind === 'live') ? 'text-[#0B7A52]' : 'text-brand'}`}>
        {attraction ? 'Ouvert tous les jours · réservez votre date' : when}
      </p>
      <p className="mt-1 line-clamp-2 font-display text-[16.5px] font-bold leading-snug tracking-[-0.015em]">{event.title}</p>
      <p className="mt-1 truncate text-[13.5px] text-ink-3">{place}</p>
      <p className={`mt-1.5 text-[14px] font-semibold ${price.tone === 'free' ? 'text-[#0B7A52]' : 'text-ink'}`}>{price.label}</p>
    </Link>
  );
}
