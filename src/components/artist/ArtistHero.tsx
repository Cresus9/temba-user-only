import { Link } from 'react-router-dom';
import { CaretRight, MapPin, SealCheck, ShareNetwork, Ticket } from '@phosphor-icons/react';
import type { CatalogArtist, CatalogShow } from '../../services/laCatalog';
import { whenLabel } from '../../utils/eventDisplay';
import { countryLabel, dayParts, genreChips } from '../../utils/artistPage';
import { ArtistPortrait } from './ArtistImage';

interface ArtistHeroProps {
  artist: CatalogArtist;
  next?: CatalogShow;
  onShare: () => void;
}

/** Full-bleed hero on a solid ink background; the photo runs to the right edge (on top on phones). */
export function ArtistHero({ artist, next, onShare }: ArtistHeroProps) {
  const nextIso = next ? next.span.min || next.event.date : '';
  return (
    <header className="bg-ink text-white">
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,46%)]">
        <div className="order-2 flex flex-col justify-center px-5 pb-8 pt-6 md:order-1 md:py-14 md:pl-[max(2.5rem,calc((100%-1200px)/2+2.5rem))] md:pr-12">
          <nav aria-label="Fil d’Ariane" className="mb-6 hidden md:block">
            <ol className="flex items-center gap-2 text-[13px] font-medium leading-5 text-white/60">
              <li><Link to="/" className="hover:text-white">Accueil</Link></li>
              <li aria-hidden><CaretRight size={14} /></li>
              <li><Link to="/artists" className="hover:text-white">Artistes</Link></li>
              <li aria-hidden><CaretRight size={14} /></li>
              <li aria-current="page" className="text-white">{artist.name}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-artist-mono text-[12px] font-medium uppercase leading-4 tracking-[0.12em] text-white/60">Artiste</span>
            {artist.verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 px-2.5 py-1 text-[12px] font-semibold leading-4 text-accent">
                <SealCheck size={16} weight="fill" /> Profil vérifié
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 break-words font-artist text-[44px] font-extrabold leading-[1.02] tracking-[-0.02em] text-white md:text-[72px]">{artist.name}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {genreChips(artist.genre).map((g) => (
              <span key={g} className="inline-flex h-8 items-center rounded-full bg-white/10 px-3 text-[13px] font-semibold leading-5 text-white">{g}</span>
            ))}
            {artist.city ? (
              <span className="inline-flex items-center gap-1.5 pl-1 text-[14px] font-medium leading-5 text-white/80">
                <MapPin size={18} /> {artist.city}, {countryLabel(artist.countryCode)}
              </span>
            ) : null}
          </div>

          <p className="mt-6 flex items-center gap-2 text-[15px] font-medium leading-6 text-white/90">
            <span className={`h-2 w-2 shrink-0 rounded-full ${next ? 'bg-accent' : 'bg-white/30'}`} aria-hidden />
            {next ? (
              <span>
                Prochaine date <span className="font-semibold text-white">{nextIso && !next.permanent ? dayParts(nextIso).long : whenLabel(next.event, next.span)}</span>
                {next.city ? ` · ${next.city}` : ''}
              </span>
            ) : (
              <span className="text-white/70">Pas de date à venir sur Temba pour l’instant</span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {next ? (
              <a href="#dates" className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark">
                <Ticket size={20} weight="bold" /> Voir la prochaine date
              </a>
            ) : null}
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/30 px-5 text-[15px] font-semibold text-white hover:bg-white/10"
            >
              <ShareNetwork size={20} /> Partager
            </button>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <ArtistPortrait
            name={artist.name}
            photo={artist.photo}
            priority
            sizes="(min-width: 768px) 46vw, 100vw"
            width={640}
            height={640}
            className="aspect-square w-full md:aspect-auto md:h-full md:min-h-[480px]"
          />
        </div>
      </div>
    </header>
  );
}
