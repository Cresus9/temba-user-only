import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarBlank,
  CalendarDots,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartLineUp,
  Coins,
  Confetti,
  DeviceMobile,
  FilmSlate,
  MagnifyingGlass,
  Moon,
  MusicNotes,
  QrCode,
  Scan,
  SealCheck,
  TreePalm,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useEvents } from '../context/EventContext';
import PageSEO from '../components/SEO/PageSEO';
import DomePattern from '../components/design/DomePattern';
import AppBand from '../components/design/AppBand';
import HomeRails from '../components/events/HomeRails';
import { type QuickFilterState } from '../components/events/QuickFilters';
import { useEventSchedule } from '../hooks/useEventSchedule';
import { shortPlace } from '../utils/eventGeo';
import { formatCalendarDate, formatEventTime } from '../utils/formatters';
import { eventPricePresentation } from '../utils/labels';
import { eventPublicPath } from '../utils/eventPath';
import { dedupeEvents, isPastSpan, spanFor } from '../utils/eventDisplay';
import FlyerFrame from '../components/events/FlyerFrame';
const CHIP = [
  { kind: 'concert' as const, label: 'Concerts', icon: MusicNotes, to: '/events?category=concerts' },
  { kind: 'festival' as const, label: 'Festivals', icon: Confetti, to: '/events?category=festivals' },
  { kind: 'cinema' as const, label: 'Cinéma', icon: FilmSlate, to: '/events?category=cinema' },
  { kind: 'attraction' as const, label: 'Attractions', icon: TreePalm, to: '/attractions' },
];

export default function Home() {
  const navigate = useNavigate();
  const { filteredEvents, loading } = useEvents();
  const { spans, kinds, permanent, running, ready } = useEventSchedule(filteredEvents ?? []);
  const [filters, setFilters] = useState<QuickFilterState>({
    city: 'Ouagadougou',
    tonight: false,
    weekend: false,
    free: false,
  });

  const [query, setQuery] = useState('');
  const [where, setWhere] = useState('Ouagadougou');
  const [when, setWhen] = useState('');
  const [slide, setSlide] = useState(0);

  const cities = useMemo(() => {
    const set = new Set<string>();
    (filteredEvents ?? []).forEach((event) => {
      if (event.city) set.add(event.city);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [filteredEvents]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    if (where) params.set('location', where);
    if (when) params.set('date', when);
    navigate(`/events${params.toString() ? `?${params}` : ''}`);
  };

  const featured = useMemo(() => {
    const pool = dedupeEvents([...(filteredEvents ?? []), ...permanent]);
    const flagged = pool.filter((event) => event.featured && (event.is_permanent || !isPastSpan(spans.get(event.id) ?? spanFor(event))));
    const list = (flagged.length ? flagged : pool.filter((event) => event.image_url && (event.is_permanent || !isPastSpan(spans.get(event.id) ?? spanFor(event))))).slice(0, 2);
    return list.sort((a, b) => {
      if (Boolean(a.is_permanent) !== Boolean(b.is_permanent)) return a.is_permanent ? 1 : -1;
      return String(a.date || '').localeCompare(String(b.date || ''));
    });
  }, [filteredEvents, permanent, spans]);
  const current = featured[Math.min(slide, Math.max(featured.length - 1, 0))];
  const categoryCounts = useMemo(() => {
    const counts = { concert: 0, festival: 0, cinema: 0, attraction: permanent.length };
    (filteredEvents ?? []).forEach((event) => {
      const kind = kinds.get(event.id);
      if (kind === 'concert' || kind === 'festival' || kind === 'cinema') counts[kind] += 1;
    });
    return counts;
  }, [filteredEvents, kinds, permanent.length]);

  return (
    <div className="overflow-x-clip bg-white">
      <PageSEO
        title="Temba — billetterie en FCFA"
        description="Concerts, festivals et spectacles à Ouagadougou, Bobo-Dioulasso et Abidjan. Payez par Mobile Money, présentez le QR à l'entrée."
        canonicalUrl="https://tembas.com/"
        ogImage="https://tembas.com/temba-wordmark-dark.jpg"
      />

      <section className="relative -mt-14 overflow-hidden bg-brand text-white lg:-mt-[72px]">
        <DomePattern variant="hero" className="hidden object-right-bottom md:block" />
        <DomePattern variant="hero-mobile" className="object-right-bottom md:hidden" />
        <div className="relative grid items-center gap-8 px-5 pb-8 pt-20 min-[1100px]:grid-cols-[minmax(0,680px)_440px] min-[1100px]:justify-between min-[1100px]:px-16 min-[1100px]:pb-14 min-[1100px]:pt-[104px] min-[1440px]:px-20">
          <div>
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-white/80 md:text-[13.5px]"><i className="h-1.5 w-1.5 rounded-full bg-[#F6B84A]" /> Billetterie officielle · Burkina Faso · Côte d’Ivoire</p>
            <h1 className="mt-3 max-w-[680px] font-display text-[36px] font-bold leading-none tracking-[-0.04em] text-white md:mt-4 md:text-[60px]">
              Les meilleures sorties, réservées en FCFA.
            </h1>
            <p className="mb-5 mt-3 max-w-[560px] text-[15px] leading-relaxed text-white/85 md:mb-0 md:mt-4 md:text-[18px] md:leading-[1.5]">
              <span className="md:hidden">Concerts, festivals et spectacles à Ouaga, Bobo et Abidjan.</span>
              <span className="hidden md:inline">Concerts, festivals et spectacles à Ouaga, Bobo et Abidjan. Payez par Mobile Money, présentez le QR à l’entrée.</span>
            </p>
            <form onSubmit={onSearch} className="mt-5 grid max-w-[680px] grid-cols-1 gap-2 rounded-[14px] bg-white p-2 text-ink shadow-[0_18px_40px_-22px_rgba(3,6,30,0.55)] md:grid-cols-[minmax(0,1.4fr)_1px_minmax(0,1.1fr)_1px_minmax(0,1.1fr)_auto] md:items-center md:gap-0">
              <label className="px-3 py-1.5">
                <span className="block text-[12px] font-semibold text-ink-3">Quoi</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Artiste, événement, lieu"
                  className="mt-0.5 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
                />
              </label>
              <span className="hidden h-9 bg-line md:block" />
              <label className="relative border-t border-line px-3 py-1.5 md:border-t-0">
                <span className="block text-[12px] font-semibold text-ink-3">Où</span>
                <select
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent pr-6 text-[15px] font-medium focus:outline-none"
                >
                  <option value="">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <CaretDown size={16} className="pointer-events-none absolute bottom-3 right-3 text-ink-3" />
              </label>
              <span className="hidden h-9 bg-line md:block" />
              <label className="relative border-t border-line px-3 py-1.5 md:border-t-0">
                <span className="block text-[12px] font-semibold text-ink-3">Quand</span>
                <select
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent pr-6 text-[15px] font-medium focus:outline-none"
                >
                  <option value="">Toutes les dates</option>
                  <option value="today">Ce soir</option>
                  <option value="weekend">Ce week-end</option>
                  <option value="week">Cette semaine</option>
                </select>
                <CaretDown size={16} className="pointer-events-none absolute bottom-3 right-3 text-ink-3" />
              </label>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-brand px-5 text-[15px] font-semibold text-white md:h-[52px]">
                <MagnifyingGlass size={18} />
                Rechercher
              </button>
            </form>
            <div className="mt-4 flex flex-nowrap gap-4 overflow-hidden text-[12.5px] font-medium text-white/80 md:mt-5 md:gap-6 md:text-[14px]">
              <span className="inline-flex items-center gap-2"><DeviceMobile size={18} /> Mobile Money ou carte</span>
              <span className="inline-flex items-center gap-2"><SealCheck size={18} /> Prix officiels, sans revente</span>
              <span className="hidden items-center gap-2 md:inline-flex"><QrCode size={18} /> Billet QR, même hors ligne</span>
            </div>
          </div>

          {current && (
            <div>
              <div className="grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl bg-white text-ink min-[1100px]:grid-cols-[200px_minmax(0,1fr)]">
                <div className="relative min-h-[140px] min-[1100px]:min-h-[250px]">
                  <FlyerFrame src={current.image_url} alt={current.title} eager className="h-full rounded-none" />
                  <span className="absolute left-2 top-2 rounded-md bg-[#F6B84A] px-2 py-1 text-[12px] font-semibold text-ink">À la une</span>
                </div>
                <div className="flex min-w-0 flex-col p-3.5 min-[1100px]:p-5">
                  <p className="text-[12px] font-semibold text-ink-3">{current.is_permanent ? 'Attraction' : kinds.get(current.id) === 'concert' ? 'Concert · Musique' : kinds.get(current.id) === 'festival' ? 'Festival' : kinds.get(current.id) === 'cinema' ? 'Cinéma' : 'Événement'}</p>
                  <p className="mt-2 text-[13px] font-semibold text-brand">{current.is_permanent ? 'Ouvert tous les jours' : `${formatCalendarDate(current.date, { weekday: 'short', day: 'numeric', month: 'short' }, current.timezone)}${formatEventTime(current.time) ? ` · ${formatEventTime(current.time)}` : ''}`}</p>
                  <p className="mt-1 font-display text-[17px] font-bold leading-tight min-[1100px]:text-[22px]">{current.title}</p>
                  <p className="mt-1 text-[12.5px] text-ink-3 min-[1100px]:text-[13.5px]">{shortPlace(current.location, current.city).label}</p>
                  <p className="mt-auto pt-2 text-[14px] font-semibold">{eventPricePresentation(current).label}</p>
                  <Link to={eventPublicPath(current)} className="mt-3 hidden h-[42px] items-center justify-center rounded-[10px] bg-brand text-[14.5px] font-semibold text-white min-[1100px]:inline-flex">Voir l’événement <ArrowRight size={16} /></Link>
                </div>
              </div>
              {featured.length > 1 && (
                <div className="mt-3 flex items-center gap-3 text-[13.5px] text-white/80">
                  <span className="flex gap-1.5">{featured.map((event, index) => <i key={event.id} className={`h-1 rounded-full ${index === slide ? 'w-8 bg-white' : 'w-4 bg-white/40'}`} />)}</span>
                  <span>{slide + 1} / {featured.length}</span>
                  <span className="hidden min-w-0 flex-1 truncate min-[1100px]:inline">· Suivant : {featured[(slide + 1) % featured.length].title}</span>
                  <button type="button" aria-label="Précédent" onClick={() => setSlide((n) => (n - 1 + featured.length) % featured.length)} className="hidden h-[34px] w-[34px] place-items-center rounded-full border border-white/30 min-[1100px]:grid"><CaretLeft size={15} weight="bold" /></button>
                  <button type="button" aria-label="Suivant" onClick={() => setSlide((n) => (n + 1) % featured.length)} className="hidden h-[34px] w-[34px] place-items-center rounded-full border border-white/30 min-[1100px]:grid"><CaretRight size={15} weight="bold" /></button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="sticky top-14 z-40 border-b border-line bg-white lg:top-[72px]">
        <div className="flex h-[72px] items-center gap-2.5 overflow-x-auto px-5 min-[1280px]:px-16 min-[1440px]:px-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <label className="hidden h-[42px] shrink-0 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[14.5px] font-semibold md:inline-flex">
            <select aria-label="Ville" value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} className="appearance-none bg-transparent pr-4 focus:outline-none">
              {['Ouagadougou', 'Bobo-Dioulasso', 'Abidjan', 'Toutes les villes'].map((city) => <option key={city}>{city}</option>)}
            </select>
            <CaretDown size={13} weight="bold" />
          </label>
          <span className="hidden h-7 w-px bg-line md:block" />
          <button type="button" onClick={() => setFilters({ ...filters, tonight: !filters.tonight, weekend: false })} className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium ${filters.tonight ? 'border-ink bg-ink text-white' : 'border-line'}`}><Moon size={17} /> Ce soir</button>
          <button type="button" onClick={() => setFilters({ ...filters, weekend: !filters.weekend, tonight: false })} className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium ${filters.weekend ? 'border-ink bg-ink text-white' : 'border-line'}`}><CalendarBlank size={17} /> Ce week-end</button>
          <span className="hidden h-7 w-px bg-line md:block" />
          {CHIP.filter((chip) => (categoryCounts[chip.kind] || 0) > 0).map((chip) => (
            <Link key={chip.label} to={chip.to} className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[14px] font-medium">
              <chip.icon size={17} /> {chip.label}
            </Link>
          ))}
          <Link to="/events" className="ml-auto inline-flex shrink-0 items-center gap-1 text-[14.5px] font-semibold text-brand"><CalendarDots size={16} /> Agenda complet</Link>
        </div>
      </div>
      <HomeRails events={dedupeEvents([...(filteredEvents ?? []), ...running])} permanent={permanent} ready={ready} loading={loading} spans={spans} kinds={kinds} filters={filters} />

      <section className="px-5 pt-12 min-[1280px]:px-16 min-[1440px]:px-20">
        <AppBand exampleTitle={current?.title || 'Alif Naaba'} />
      </section>

      <section className="px-5 pb-20 pt-8 min-[1280px]:px-16 min-[1440px]:px-20">
        <div className="grid items-center gap-8 rounded-[20px] bg-[#F7F4EE] px-6 py-8 md:grid-cols-[1.1fr_1fr] md:px-14 md:py-12">
          <div>
            <p className="text-[13.5px] font-semibold text-brand">Organisateurs</p>
            <h2 className="mt-3 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[40px]">Vous organisez<br />un événement ?</h2>
            <p className="mt-3 max-w-[460px] text-[16.5px] leading-relaxed text-ink-3">Vendez vos billets en FCFA, suivez vos ventes et contrôlez l’entrée avec Temba.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link to="/organizers" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-brand px-5 text-[15px] font-semibold text-white">Devenir organisateur <ArrowRight size={16} /></Link>
              <a href="https://wa.me/22674750815" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-line bg-white px-5 text-[15px] font-semibold"><WhatsappLogo size={18} /> Parler à l’équipe</a>
            </div>
          </div>
          <div className="space-y-3.5 text-[15px] text-ink-2">
            <p className="flex gap-3"><Coins size={22} className="shrink-0 text-brand" /><span><b className="block text-ink">Vente en FCFA</b>Mobile Money et carte, au prix que vous fixez.</span></p>
            <p className="flex gap-3"><ChartLineUp size={22} className="shrink-0 text-brand" /><span><b className="block text-ink">Suivi des ventes</b>Billets vendus et recettes, événement par événement.</span></p>
            <p className="flex gap-3"><Scan size={22} className="shrink-0 text-brand" /><span><b className="block text-ink">Contrôle à l’entrée</b>Les billets QR sont vérifiés à la porte.</span></p>
          </div>
        </div>
      </section>
    </div>
  );
}
