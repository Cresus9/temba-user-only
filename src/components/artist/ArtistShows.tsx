import { Link } from 'react-router-dom';
import { ArrowRight, CalendarBlank, MapPin } from '@phosphor-icons/react';
import type { CatalogArtist, CatalogShow } from '../../services/laCatalog';
import { whenLabel } from '../../utils/eventDisplay';
import { eventPublicPath } from '../../utils/eventPath';
import { roleBadge } from '../../utils/artistDisplay';
import { dayParts, showPriceLine } from '../../utils/artistPage';
import { ArtistImage } from './ArtistImage';

export function DateBlock({ show }: { show: CatalogShow }) {
  const iso = show.span.min || show.event.date;
  if (show.permanent || !iso) {
    return (
      <span className="flex h-16 w-14 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-brand" aria-hidden>
        <CalendarBlank size={26} />
      </span>
    );
  }
  const p = dayParts(iso);
  return (
    <time dateTime={iso.slice(0, 10)} className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-white text-ink">
      <span className="font-artist-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-brand">{p.month}</span>
      <span className="text-[24px] font-extrabold leading-7">{p.day}</span>
    </time>
  );
}

function RoleChip({ role }: { role?: string }) {
  const label = roleBadge(role);
  if (!label) return null;
  return <span className="inline-flex h-6 items-center rounded-md bg-surf px-2 text-[12px] font-semibold text-ink-2">{label}</span>;
}

export function UpcomingRow({ show }: { show: CatalogShow }) {
  const price = showPriceLine(show);
  return (
    <li>
      <Link
        to={eventPublicPath(show.event)}
        className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-5 hover:bg-surf/60 md:grid-cols-[56px_minmax(0,1fr)_auto_auto] md:gap-5"
      >
        <DateBlock show={show} />
        <span className="min-w-0">
          <span className="block font-artist-mono text-[12px] font-medium leading-5 text-ink-3">{whenLabel(show.event, show.span)}</span>
          <span className="block truncate text-[17px] font-bold leading-6 text-ink">{show.event.title}</span>
          <span className="flex items-start gap-1.5 text-[14px] leading-5 text-ink-3 md:items-center">
            <MapPin size={16} className="mt-0.5 shrink-0 md:mt-0" />
            <span className="min-w-0 md:truncate">
              {show.venueName}
              {show.city ? ` · ${show.city}` : ''}
            </span>
          </span>
          <span className="mt-2 block md:hidden"><RoleChip role={show.role} /></span>
        </span>
        <span className="hidden md:block"><RoleChip role={show.role} /></span>
        <span className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:col-start-auto md:block md:text-right">
          <span className="block font-artist-mono text-[14px] font-semibold text-ink">{price.label}</span>
          {price.soon ? (
            <span className="inline-flex items-center rounded-md bg-accent/20 px-2 py-0.5 text-[11px] font-semibold leading-4 text-accent-700 md:mt-1">
              Vente pas encore ouverte
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function PastRow({ show }: { show: CatalogShow }) {
  const iso = show.span.min || show.event.date;
  const year = iso ? dayParts(iso).year : '';
  const multi = show.span.min && show.span.max && show.span.min !== show.span.max;
  return (
    <li>
      <Link
        to={eventPublicPath(show.event)}
        className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-4 hover:bg-surf/60 md:grid-cols-[56px_minmax(0,1fr)_auto_auto] md:gap-5"
      >
        <span className="block h-[72px] w-14 overflow-hidden rounded-md bg-ink-800">
          {show.event.image_url ? (
            <ArtistImage src={show.event.image_url} alt="" sizes="56px" width={56} height={72} grayscale className="h-full w-full object-cover" />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="block font-artist-mono text-[12px] font-medium leading-5 text-ink-3">
            {whenLabel(show.event, show.span)}
            {!multi && year ? ` ${year}` : ''}
          </span>
          <span className="block truncate text-[16px] font-semibold leading-6 text-ink">{show.event.title}</span>
          <span className="block truncate text-[14px] leading-5 text-ink-3">
            {show.venueName}
            {show.city ? ` · ${show.city}` : ''}
          </span>
        </span>
        <span className="hidden md:block"><RoleChip role={show.role} /></span>
        <span className="font-artist-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Terminé</span>
      </Link>
    </li>
  );
}

export function EmptyDates({ artist }: { artist: CatalogArtist }) {
  const place = artist.city || 'Ouagadougou';
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-ink-4/60 p-6 md:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surf text-ink-2"><CalendarBlank size={24} /></span>
      <p className="mt-4 text-[20px] font-bold leading-7 text-ink">Pas de date à venir sur Temba pour l’instant.</p>
      <p className="mt-2 max-w-lg text-[15px] leading-6 text-ink-3">
        La prochaine date de {artist.name} s’affichera ici dès qu’un organisateur la publie.
      </p>
      <Link to="/events" className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark">
        Voir l’agenda à {place} <ArrowRight size={18} />
      </Link>
    </div>
  );
}
