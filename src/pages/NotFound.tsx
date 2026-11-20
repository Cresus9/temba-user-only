import { Link } from 'react-router-dom';
import { CaretRight, MagnifyingGlass, Ticket } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import PageSEO from '../components/SEO/PageSEO';
import { useEvents } from '../context/EventContext';
import { pickSpotlightEvents } from '../utils/eventGeo';
import { calendarDayInZone } from '../utils/formatters';

/**
 * Real "not found" page (Badge v3, calm process page: no dotted dome).
 * Blue #3D3FE2 actions on white, ink #14172A text. Always noindex.
 */
export default function NotFound() {
  const navigate = useNavigate();
  const { filteredEvents } = useEvents();
  const [query, setQuery] = useState('');
  const spotlight = useMemo(
    () => pickSpotlightEvents(filteredEvents ?? [], 5, calendarDayInZone()),
    [filteredEvents],
  );

  return (
    <div className="bg-white text-[#14172A]">
      <PageSEO
        title="Page introuvable"
        description="Cette page n’existe pas, ou plus."
        robots="noindex, follow"
      />
      <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-24">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <p className="font-mono text-[15px] font-bold text-[#3D3FE2]">Erreur 404</p>
            <h1 className="mt-3 font-display text-[36px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[56px]">
              Cette page n’existe pas, ou plus.
            </h1>
            <p className="mt-3.5 text-[17px] leading-relaxed text-[#14172A]/70 md:text-[18px]">
              L’événement est peut-être terminé, ou le lien a changé. Vous pouvez chercher directement :
            </p>
            <form
              role="search"
              className="mt-6 flex h-12 max-w-[480px] items-center gap-2.5 rounded-[10px] border border-[#14172A]/15 px-3.5 focus-within:border-[#3D3FE2]"
              onSubmit={(event) => {
                event.preventDefault();
                const params = new URLSearchParams();
                if (query.trim()) params.set('query', query.trim());
                navigate(`/events${params.toString() ? `?${params}` : ''}`);
              }}
            >
              <MagnifyingGlass size={20} className="shrink-0 text-[#14172A]/60" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Événement, artiste, lieu"
                aria-label="Rechercher un événement, un artiste ou un lieu"
                className="w-full bg-transparent text-[16px] text-[#14172A] placeholder:text-[#14172A]/50 focus:outline-none"
              />
            </form>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                to="/events"
                className="inline-flex h-12 items-center rounded-[10px] bg-[#3D3FE2] px-5 text-[15px] font-semibold text-white hover:bg-[#2F3095]"
              >
                Voir l’agenda
              </Link>
              <Link
                to="/"
                className="inline-flex h-12 items-center rounded-[10px] border border-[#14172A]/15 px-5 text-[15px] font-semibold text-[#14172A]"
              >
                Retour à l’accueil
              </Link>
            </div>
          </div>
          <div className="relative flex h-[200px] items-end overflow-hidden rounded-2xl bg-[#3D3FE2] p-6 md:h-[340px] md:p-8">
            <Ticket size={44} weight="duotone" className="absolute right-6 top-6 text-white/80 md:right-8 md:top-8" aria-hidden />
            <p className="font-display text-[88px] font-extrabold leading-none tracking-[-0.05em] text-white md:text-[120px]">404</p>
          </div>
        </div>

        {spotlight.length > 0 && (
          <>
            <div className="mb-5 mt-14 flex items-end justify-between md:mt-20">
              <h2 className="font-display text-[20px] font-bold">Prochainement</h2>
              <Link to="/events" className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#3D3FE2]">
                Tout l’agenda <CaretRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
              {spotlight.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
