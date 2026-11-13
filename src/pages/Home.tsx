import { FormEvent, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CaretDown,
  Confetti,
  DeviceMobile,
  FilmSlate,
  MagnifyingGlass,
  MaskHappy,
  MusicNotes,
  SealCheck,
  SoccerBall,
  TreePalm,
  UsersThree,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useEvents } from '../context/EventContext';
import PageSEO from '../components/SEO/PageSEO';
import DomePattern from '../components/design/DomePattern';
import StoreBadges from '../components/design/StoreBadges';
import HomeRails from '../components/events/HomeRails';
import QuickFilters, { type QuickFilterState } from '../components/events/QuickFilters';
import { useEventSchedule } from '../hooks/useEventSchedule';
import { shortPlace } from '../utils/eventGeo';
import { formatCalendarDate, formatEventTime } from '../utils/formatters';
import { eventPricePresentation } from '../utils/labels';
import { eventPublicPath } from '../utils/eventPath';

const CATS = [
  { icon: MusicNotes, label: 'Concerts', to: '/categories/concerts-de-musique' },
  { icon: Confetti, label: 'Festivals', to: '/categories/festivals' },
  { icon: FilmSlate, label: 'Cinéma', to: '/categories/cinema' },
  { icon: SoccerBall, label: 'Sport', to: '/categories/sport' },
  { icon: MaskHappy, label: 'Spectacles', to: '/events' },
  { icon: TreePalm, label: 'Attractions', to: '/attractions' },
];

export default function Home() {
  const navigate = useNavigate();
  const { filteredEvents, loading } = useEvents();
  const { spans, kinds } = useEventSchedule(filteredEvents ?? []);
  const [filters, setFilters] = useState<QuickFilterState>({
    city: 'Ouagadougou',
    tonight: false,
    weekend: false,
    free: false,
  });

  const [query, setQuery] = useState('');
  const [where, setWhere] = useState('');
  const [when, setWhen] = useState('');

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
    if (when === 'weekend') params.set('date', 'weekend');
    navigate(`/events${params.toString() ? `?${params}` : ''}`);
  };

  const hero = useMemo(() => {
    const list = filteredEvents ?? [];
    return list.find((event) => event.featured && event.image_url) ?? list.find((event) => event.image_url);
  }, [filteredEvents]);
  const heroPrice = hero ? eventPricePresentation(hero) : null;

  return (
    <div className="bg-white">
      <PageSEO
        title="Temba — billetterie en FCFA"
        description="Concerts, festivals et spectacles à Ouagadougou, Bobo-Dioulasso et Abidjan. Payez par Mobile Money, présentez le QR à l'entrée."
        canonicalUrl="https://tembas.com/"
        ogImage="https://tembas.com/temba-wordmark-dark.jpg"
      />

      <section className="relative -mt-14 overflow-hidden bg-brand pt-14 text-white lg:-mt-[72px] lg:pt-[72px]">
        <DomePattern variant="hero" className="hidden md:block" />
        <DomePattern variant="hero-mobile" className="md:hidden" />
        <div className="relative mx-auto grid max-w-[1200px] items-end gap-8 px-5 pb-10 pt-7 md:grid-cols-[minmax(0,1fr)_320px] md:gap-10 md:px-10 md:pb-14 md:pt-14">
          <div>
            <p className="text-[14px] font-semibold text-white/80">Billetterie officielle · Burkina Faso · Côte d'Ivoire</p>
            <h1 className="mt-4 max-w-[680px] font-display text-[36px] font-bold leading-[1.02] tracking-[-0.035em] text-white md:text-[64px]">
              Les meilleures sorties, réservées en FCFA.
            </h1>
            <p className="mb-6 mt-4 max-w-[560px] text-[17px] leading-relaxed text-white/85 md:text-[19px]">
              Concerts, festivals et spectacles à Ouaga, Bobo et Abidjan. Payez par Mobile Money, présentez le QR à l'entrée.
            </p>
            <form onSubmit={onSearch} className="flex max-w-[760px] flex-col gap-2 rounded-xl bg-white p-1.5 text-ink shadow-[0_12px_32px_rgba(3,6,30,0.18)] md:flex-row md:items-stretch md:gap-0">
              <label className="flex-1 px-4 py-2 md:border-r md:border-line">
                <span className="block text-[12px] font-semibold text-ink-3">Quoi</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Artiste, événement, lieu"
                  className="mt-0.5 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
                />
              </label>
              <label className="relative flex-1 px-4 py-2 md:border-r md:border-line">
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
              <label className="relative flex-1 px-4 py-2">
                <span className="block text-[12px] font-semibold text-ink-3">Quand</span>
                <select
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="mt-0.5 w-full appearance-none bg-transparent pr-6 text-[15px] font-medium focus:outline-none"
                >
                  <option value="">Toutes les dates</option>
                  <option value="weekend">Ce week-end</option>
                </select>
                <CaretDown size={16} className="pointer-events-none absolute bottom-3 right-3 text-ink-3" />
              </label>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-brand px-6 text-[15px] font-semibold text-white md:h-14">
                <MagnifyingGlass size={18} />
                Rechercher
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[14px] font-medium text-white/90">
              <span className="inline-flex items-center gap-2"><UsersThree size={20} /><b className="font-bold">15 000+</b> utilisateurs</span>
              <span className="inline-flex items-center gap-2"><DeviceMobile size={20} />Mobile Money et carte</span>
              <span className="inline-flex items-center gap-2"><SealCheck size={20} />Prix officiels, sans revente</span>
            </div>
          </div>

          {hero && (
            <Link to={eventPublicPath(hero)} className="hidden overflow-hidden rounded-xl bg-white text-ink md:block">
              <div className="relative">
                {hero.image_url ? <img src={hero.image_url} alt="" className="h-[272px] w-full object-cover" /> : <div className="h-[272px] bg-surf" />}
                <span className="absolute left-3 top-3 inline-flex h-[22px] items-center rounded-[5px] bg-ink px-2 text-[11px] font-bold uppercase tracking-wide text-white">À la une</span>
              </div>
              <div className="px-[18px] pb-[18px] pt-4">
                <p className="text-[13px] font-semibold text-brand">
                  {hero.is_permanent ? 'Ouvert toute l’année' : formatCalendarDate(hero.date, { weekday: 'short', day: 'numeric', month: 'short' }, hero.timezone)}
                  {formatEventTime(hero.time) ? ` · ${formatEventTime(hero.time)}` : ''}
                </p>
                <p className="mt-1 font-display text-[19px] font-bold leading-tight tracking-[-0.02em]">{hero.title}</p>
                <div className="mt-3 flex items-center justify-between text-[14px]">
                  <span className="truncate text-ink-3">{shortPlace(hero.location, hero.city).label}</span>
                  <b className="tabular-nums">{heroPrice?.label}</b>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      <div className="border-b border-line">
        <div className="mx-auto flex max-w-[1200px] overflow-x-auto px-2 md:px-6">
          {CATS.map(({ icon: Icon, label, to }) => (
            <Link key={label} to={to} className="flex min-w-[140px] flex-1 items-center gap-3 border-l border-line px-4 py-4 text-[15px] font-semibold first:border-l-0">
              <Icon size={24} className="shrink-0 text-brand" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <QuickFilters value={filters} onChange={setFilters} />
      <HomeRails events={filteredEvents ?? []} loading={loading} spans={spans} kinds={kinds} filters={filters} />

      <section className="mx-auto max-w-[1200px] px-5 pt-16 md:px-10 md:pt-20">
        <div className="relative grid min-h-[280px] overflow-hidden rounded-2xl bg-brand text-white md:grid-cols-[1.1fr_1fr]">
          <DomePattern variant="dome" className="object-right-bottom" />
          <div className="relative px-7 py-10 md:px-14 md:py-14">
            <p className="text-[14px] font-semibold text-white/80">Application Temba</p>
            <h2 className="mt-2.5 font-display text-[32px] font-bold leading-tight tracking-[-0.03em] md:text-[40px]">
              Vos billets,<br />même sans réseau.
            </h2>
            <p className="mb-7 mt-4 max-w-[420px] text-[17px] leading-relaxed text-white/85">
              QR hors ligne, transfert gratuit en deux taps, rappels avant l'événement.
            </p>
            <StoreBadges />
          </div>
          <div className="relative hidden items-center justify-end pr-14 md:flex">
            <div className="w-[200px] rounded-xl bg-white px-4 py-4 text-center text-ink">
              <QRCodeSVG
                value="https://temba.onelink.me/Xbe8"
                size={168}
                className="mx-auto"
                aria-label="QR de téléchargement de l'application Temba"
              />
              <p className="mt-2.5 text-[13px] font-semibold">Scannez pour télécharger</p>
              <p className="text-[12px] text-ink-3">temba.onelink.me</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-16 pt-6 md:px-10 md:pb-24">
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-line px-6 py-8 md:flex-row md:items-center md:gap-10 md:px-12 md:py-10">
          <div className="flex-1">
            <p className="eyebrow">Organisateurs</p>
            <h2 className="mt-1.5 font-display text-[28px] font-bold tracking-[-0.03em]">Vous organisez un événement ?</h2>
            <p className="mt-2 text-[16px] text-ink-3">Vendez vos billets en FCFA, suivez vos ventes et contrôlez l'entrée avec Temba.</p>
          </div>
          <Link to="/organizers" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-ink px-5 text-[15px] font-semibold text-white">
            Devenir organisateur <ArrowRight size={18} />
          </Link>
          <a href="https://wa.me/22674750815" className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-line bg-white px-5 text-[15px] font-semibold">
            <WhatsappLogo size={18} /> Parler à l'équipe
          </a>
        </div>
      </section>
    </div>
  );
}
