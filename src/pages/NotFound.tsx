import { Link } from 'react-router-dom';
import { CaretRight, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DomePattern from '../components/design/DomePattern';
import EventCard from '../components/EventCard';
import PageSEO from '../components/SEO/PageSEO';
import { useEvents } from '../context/EventContext';
import { pickSpotlightEvents } from '../utils/eventGeo';
import { calendarDayInZone } from '../utils/formatters';

export default function NotFound() {
  const navigate = useNavigate();
  const { filteredEvents } = useEvents();
  const [query, setQuery] = useState('');
  const spotlight = useMemo(
    () => pickSpotlightEvents(filteredEvents ?? [], 5, calendarDayInZone()),
    [filteredEvents],
  );

  return (
    <div className="bg-white">
      <PageSEO
        title="Page introuvable"
        description="Cette page n'existe pas, ou plus."
        robots="noindex, nofollow"
      />
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-10 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="font-mono text-[15px] font-bold text-brand">Erreur 404</p>
            <h1 className="mt-3 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.035em] md:text-[56px]">
              Cette page n'existe pas, ou plus.
            </h1>
            <p className="mt-3.5 text-[18px] leading-relaxed text-ink-3">
              L'événement est peut-être terminé ou le lien a changé. Cherchez directement :
            </p>
            <form
              className="mt-6 flex h-12 max-w-[480px] items-center gap-2.5 rounded-[10px] border border-line px-3.5"
              onSubmit={(event) => {
                event.preventDefault();
                const params = new URLSearchParams();
                if (query.trim()) params.set('query', query.trim());
                navigate(`/events${params.toString() ? `?${params}` : ''}`);
              }}
            >
              <MagnifyingGlass size={20} className="text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Événement, artiste, lieu"
                className="w-full bg-transparent text-[15px] focus:outline-none"
              />
            </form>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link to="/events" className="inline-flex h-12 items-center rounded-[10px] bg-ink px-5 text-[15px] font-semibold text-white">Voir l'agenda</Link>
              <Link to="/" className="inline-flex h-12 items-center rounded-[10px] border border-line px-5 text-[15px] font-semibold">Retour à l'accueil</Link>
            </div>
          </div>
          <div className="relative h-[280px] overflow-hidden rounded-2xl bg-brand md:h-[340px]">
            <DomePattern variant="dome" className="object-[70%_100%]" />
            <p className="absolute bottom-6 left-8 font-display text-[96px] font-extrabold leading-none tracking-[-0.05em] text-white md:text-[120px]">404</p>
          </div>
        </div>

        {spotlight.length > 0 && (
          <>
            <div className="mb-5 mt-16 flex items-end justify-between md:mt-20">
              <h2 className="font-display text-[20px] font-bold">Prochainement</h2>
              <Link to="/events" className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand">
                Tout l'agenda <CaretRight size={16} />
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
