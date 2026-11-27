import { Link } from 'react-router-dom';
import type { CatalogArtist } from '../../services/laCatalog';
import { ArtistPortrait } from './ArtistImage';

/** Rail of artists: horizontal scroll on phones, 3-column grid from md. */
export function ArtistGrid({ artists }: { artists: CatalogArtist[] }) {
  return (
    <ul className="-mx-5 mt-5 flex snap-x gap-4 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
      {artists.map((p) => (
        <li key={p.id} className="w-[150px] shrink-0 snap-start md:w-auto">
          <Link to={`/artists/${p.slug}`} className="block">
            <ArtistPortrait name={p.name} photo={p.photo} sizes="(min-width: 768px) 240px, 150px" className="aspect-square w-full rounded-xl" />
            <span className="mt-3 block text-[16px] font-bold leading-6 text-ink">{p.name}</span>
            <span className="block text-[13px] leading-5 text-ink-3">{[p.genre, p.city].filter(Boolean).join(' · ')}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
