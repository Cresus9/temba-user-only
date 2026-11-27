import { useState } from 'react';
import { ArrowUpRight, CaretDown, FacebookLogo, Globe, InstagramLogo, MapPin, MusicNotes, YoutubeLogo } from '@phosphor-icons/react';
import BrandMark from '../directory/BrandMark';
import type { CatalogArtist } from '../../services/laCatalog';
import { countryLabel, type ArtistLink } from '../../utils/artistPage';

export function ArtistAbout({ artist }: { artist: CatalogArtist }) {
  const [open, setOpen] = useState(false);
  const long = artist.bio.length > 150;
  return (
    <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_240px]">
      <div>
        {artist.bio ? (
          <p className={`max-w-xl text-[16px] leading-7 text-ink-2 ${long && !open ? 'line-clamp-3' : ''}`}>{artist.bio}</p>
        ) : (
          <p className="max-w-xl text-[16px] leading-7 text-ink-3">La biographie de {artist.name} sera bientôt disponible.</p>
        )}
        {long ? (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-brand">
            {open ? 'Voir moins' : 'Lire la suite'} <CaretDown size={16} className={open ? 'rotate-180' : ''} />
          </button>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-[14px] md:grid-cols-1">
        {artist.genre ? (
          <div>
            <dt className="font-artist-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-ink-3">Genre</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-semibold text-ink"><MusicNotes size={18} className="shrink-0 text-ink-3" /> {artist.genre}</dd>
          </div>
        ) : null}
        {artist.city ? (
          <div>
            <dt className="font-artist-mono text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-ink-3">Origine</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-semibold text-ink"><MapPin size={18} className="shrink-0 text-ink-3" /> {artist.city}, {countryLabel(artist.countryCode)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function LinkIcon({ kind }: { kind: ArtistLink['kind'] }) {
  if (kind === 'instagram') return <InstagramLogo size={22} />;
  if (kind === 'facebook') return <FacebookLogo size={22} />;
  if (kind === 'youtube') return <YoutubeLogo size={22} />;
  if (kind === 'soundcloud') return <BrandMark brand="soundcloud" size={22} />;
  return <Globe size={22} />;
}

/** Only the links that exist in the database. */
export function ArtistLinks({ links }: { links: ArtistLink[] }) {
  return (
    <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
      {links.map((l) => (
        <li key={l.kind}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center justify-between rounded-xl border border-line px-4 text-[15px] font-semibold text-ink hover:border-ink-4">
            <span className="inline-flex items-center gap-2.5"><LinkIcon kind={l.kind} /> {l.label}</span>
            <ArrowUpRight size={18} className="text-ink-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}
