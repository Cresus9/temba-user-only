import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from '@phosphor-icons/react';
import type { CatalogArtist, CatalogShow } from '../../services/laCatalog';
import { whenLabel } from '../../utils/eventDisplay';
import { eventPublicPath } from '../../utils/eventPath';
import { ticketNameFr } from '../../utils/labels';
import { showPriceLine, showTiers } from '../../utils/artistPage';
import { DateBlock } from './ArtistShows';

/** Sticky "Prochain concert" card, desktop right column. */
export function NextShowCard({ show }: { show: CatalogShow }) {
  const price = showPriceLine(show);
  const tiers = showTiers(show, ticketNameFr);
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_8px_28px_rgba(3,6,30,0.08)]">
      <p className="flex items-center gap-2 font-artist-mono text-[12px] font-semibold uppercase leading-4 tracking-[0.1em] text-accent-700">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> Prochain concert
      </p>
      <div className="mt-4 flex items-center gap-4">
        <DateBlock show={show} />
        <div className="min-w-0">
          <p className="text-[20px] font-extrabold leading-6 text-ink">{show.event.title}</p>
          <p className="mt-1 font-artist-mono text-[13px] leading-5 text-ink-3">{whenLabel(show.event, show.span)}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-[14px] leading-5 text-ink-2">
        <li className="flex items-center gap-2">
          <MapPin size={18} className="shrink-0 text-ink-3" /> {show.venueName}
          {show.city ? `, ${show.city}` : ''}
        </li>
      </ul>
      {tiers.length ? (
        <div className="mt-5 divide-y divide-line rounded-xl border border-line">
          {tiers.map((t, i) => (
            <div key={`${t.name}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
              <span className="min-w-0 truncate font-semibold text-ink">{t.name}</span>
              <span className="shrink-0 font-artist-mono font-semibold text-ink">{t.price}</span>
            </div>
          ))}
        </div>
      ) : null}
      {price.soon ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent/20 px-2.5 py-1 text-[12px] font-semibold leading-4 text-accent-700">
          <Clock size={14} weight="bold" /> Vente pas encore ouverte
        </p>
      ) : null}
      <Link to={eventPublicPath(show.event)} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white hover:bg-brand-dark">
        Voir l’événement <ArrowRight size={18} />
      </Link>
      <p className="mt-4 text-[12px] leading-5 text-ink-3">
        Paiement en F CFA : Orange Money, Moov Money ou carte. Le billet QR arrive sur votre téléphone.
      </p>
    </div>
  );
}

/** Shown in the same place when the artist has no upcoming date. */
export function NoNextCard({ artist }: { artist: CatalogArtist }) {
  const place = artist.city || 'Ouagadougou';
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_8px_28px_rgba(3,6,30,0.08)]">
      <p className="flex items-center gap-2 font-artist-mono text-[12px] font-semibold uppercase leading-4 tracking-[0.1em] text-ink-3">
        <span className="h-2 w-2 rounded-full bg-ink-4" aria-hidden /> Prochain concert
      </p>
      <p className="mt-4 text-[20px] font-extrabold leading-6 text-ink">Aucune date annoncée</p>
      <p className="mt-2 text-[14px] leading-6 text-ink-3">
        La prochaine date de {artist.name} s’affichera ici dès qu’un organisateur la publie.
      </p>
      <Link to="/events" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white hover:bg-brand-dark">
        Voir l’agenda à {place}
      </Link>
    </div>
  );
}

/** Sticky bottom bar, phones and tablets. Same data as the card. */
export function NextShowBar({ show }: { show: CatalogShow }) {
  const price = showPriceLine(show);
  return (
    <div className="sticky bottom-0 z-40 border-t border-line bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(3,6,30,0.08)] lg:hidden">
      <div className="mx-auto flex max-w-[640px] items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-5 text-ink">{whenLabel(show.event, show.span)}</p>
          <p className="text-[12px] font-medium leading-4 text-ink-3">{price.soon ? 'Vente pas encore ouverte' : price.label}</p>
        </div>
        <Link to={eventPublicPath(show.event)} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-brand px-4 text-[15px] font-semibold text-white sm:px-5">
          Voir l’événement <ArrowRight size={18} className="hidden sm:block" />
        </Link>
      </div>
    </div>
  );
}
