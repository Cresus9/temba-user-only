import { Link } from 'react-router-dom';
import { ATTRACTION_TYPE_LABELS } from '../../services/permanentVenueService';
import { formatCurrency } from '../../utils/formatters';
import { eventPublicPath } from '../../utils/eventPath';
import FlyerFrame from '../events/FlyerFrame';

export interface AttractionCardData {
  id: string;
  slug?: string | null;
  title: string;
  image_url?: string | null;
  city?: string | null;
  location?: string | null;
  country_code?: string | null;
  attraction_type?: string | null;
  featured?: boolean;
  currency?: string | null;
  ticket_types?: { price: number; available?: number; sales_enabled?: boolean }[];
}

function lowestPrice(attraction: AttractionCardData): number | null {
  const active = (attraction.ticket_types ?? []).filter(
    (ticket) => ticket.sales_enabled !== false && (ticket.available ?? 1) > 0
  );
  if (!active.length) return null;
  return Math.min(...active.map((ticket) => ticket.price));
}

export default function AttractionCard({ attraction }: { attraction: AttractionCardData }) {
  const price = lowestPrice(attraction);
  const typeLabel = ATTRACTION_TYPE_LABELS[attraction.attraction_type ?? 'other'] ?? '';
  const place = attraction.city || attraction.location;
  const amount = price === null
    ? null
    : price <= 0
      ? 'Prix bientôt disponible'
      : `Dès ${formatCurrency(price, attraction.currency ?? 'XOF')}`;

  return (
    <Link
      to={eventPublicPath(attraction)}
      className="group flex h-full flex-col border border-ink/15 bg-paper"
    >
      <FlyerFrame src={attraction.image_url} alt={attraction.title} ratio="16/9" />
      <div className="flex flex-1 flex-col border-t border-ink/10 px-4 py-3.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">
          {typeLabel}
          {attraction.featured ? ' · À la une' : ''}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-ink group-hover:text-brand">
          {attraction.title}
        </h3>
        {place ? (
          <p className="mt-1 truncate text-[13px] text-ink-mute">{place}</p>
        ) : null}
        <p className="mt-auto pt-3 text-[13px] font-semibold tabular-nums text-ink">
          {amount ?? 'Tarifs sur la fiche'}
        </p>
      </div>
    </Link>
  );
}
