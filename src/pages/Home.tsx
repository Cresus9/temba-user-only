import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import EventCard from '../components/EventCard';
import { pickSpotlightEvents, shortPlace } from '../utils/eventGeo';
import { calendarDayInZone, formatCalendarDate, formatEventTime } from '../utils/formatters';
import { eventPricePresentation } from '../utils/labels';
import { eventPublicPath } from '../utils/eventPath';
import { supabase } from '../lib/supabase-client';

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
  const { filteredEvents } = useEvents();
  const today = calendarDayInZone();
  const spotlight = useMemo(
    () => pickSpotlightEvents(filteredEvents ?? [], 12, today),
    [filteredEvents, today],
  );
  const dated = spotlight.filter((event) => !event.is_permanent);
  const hero = dated[0] ?? spotlight[0];
  const grid = dated.slice(0, 5);
  const upcoming = dated.slice(0, 5);

  const countCity = (needle: string) =>
    (filteredEvents ?? []).filter((event) => {
      const blob = `${event.city ?? ''} ${event.location ?? ''}`.toLowerCase();
      const day = (event.date ?? '').split('T')[0];
      return blob.includes(needle) && (event.is_permanent || !day || day >= today);
    }).length;

  const [query, setQuery] = useState('');
  const [where, setWhere] = useState('');
  const [when, setWhen] = useState('');
  const [artists, setArtists] = useState<{ id: string; name: string; slug: string; genre: string | null; photo_url: string | null }[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('artists')
      .select('id, name, slug, genre, photo_url')
      .limit(6)
      .then(({ data }) => {
        if (!cancelled && data) setArtists(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="relative mx-auto grid max-w-[1200px] items-end gap-10 px-5 pb-14 pt-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-14 md:px-10 md:pb-20 md:pt-[72px]">
          <div>
            <p className="text-[14px] font-semibold text-white/80">Billetterie officielle · Burkina Faso · Côte d'Ivoire</p>
            <h1 className="mt-4 max-w-[680px] font-display text-[36px] font-bold leading-[1.02] tracking-[-0.035em] text-white md:text-[64px]">
              Les meilleures sorties, réservées en FCFA.
            </h1>
            <p className="mb-8 mt-5 max-w-[560px] text-[17px] leading-relaxed text-white/85 md:text-[19px]">
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
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-[14px] font-medium text-white/90">
              <span className="inline-flex items-center gap-2"><UsersThree size={20} /><b className="font-bold">15 000+</b> utilisateurs</span>
              <span className="inline-flex items-center gap-2"><DeviceMobile size={20} />Mobile Money et carte</span>
              <span className="inline-flex items-center gap-2"><SealCheck size={20} />Prix officiels, sans revente</span>
            </div>
          </div>

          {hero && (
            <Link to={eventPublicPath(hero)} className="hidden overflow-hidden rounded-xl bg-white text-ink md:block">
              <div className="relative">
                {hero.image_url ? <img src={hero.image_url} alt="" className="h-[340px] w-full object-cover" /> : <div className="h-[340px] bg-surf" />}
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

      <section className="mx-auto max-w-[1200px] px-5 pt-12 md:px-10 md:pt-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">À l'affiche</p>
            <h2 className="mt-1.5 font-display text-[28px] font-bold tracking-[-0.03em] md:text-[32px]">À ne pas manquer</h2>
          </div>
          <Link to="/events" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand">
            Tout l'agenda <ArrowRight size={16} />
          </Link>
        </div>
        {grid.length === 0 ? (
          <p className="rounded-xl border border-line bg-surf px-5 py-10 text-[15px] text-ink-3">Les prochaines dates arrivent. Revenez bientôt, ou parcourez l'agenda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
            {grid.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-6 px-5 pt-14 md:grid-cols-2 md:px-10 md:pt-[72px]">
        {[
          { slug: 'ouagadougou', name: 'Ouagadougou', needle: 'ouaga', image: dated.find((e) => `${e.city} ${e.location}`.toLowerCase().includes('ouaga'))?.image_url },
          { slug: 'bobo-dioulasso', name: 'Bobo-Dioulasso', needle: 'bobo', image: dated.find((e) => `${e.city} ${e.location}`.toLowerCase().includes('bobo'))?.image_url },
        ].map((city) => (
          <Link key={city.slug} to={`/${city.slug}`} className="relative block h-[220px] overflow-hidden rounded-xl bg-ink text-white md:h-[260px]">
            {city.image ? <img src={city.image} alt="" className="absolute right-0 top-0 h-full w-[55%] object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-r from-ink from-45% to-transparent" />
            <div className="relative p-7 md:p-8">
              <p className="text-[13px] font-semibold text-white/70">Sortir à</p>
              <p className="mt-1 font-display text-[32px] font-bold tracking-[-0.03em] md:text-[36px]">{city.name}</p>
              <p className="mt-2 text-white/80">{countCity(city.needle)} dates à venir</p>
              <span className="mt-8 inline-flex h-10 items-center rounded-lg bg-white px-3.5 text-[14px] font-semibold text-ink">Voir l'agenda</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-12 px-5 pt-14 md:grid-cols-[1.25fr_1fr] md:px-10 md:pt-[72px]">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="font-display text-[28px] font-bold tracking-[-0.03em]">Prochaines dates</h2>
            <Link to="/events" className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand">Tout voir <ArrowRight size={16} /></Link>
          </div>
          <div>
            {upcoming.map((event) => {
              const price = eventPricePresentation(event);
              const day = event.date ? formatCalendarDate(event.date, { day: '2-digit' }, event.timezone) : '';
              const month = event.date ? formatCalendarDate(event.date, { month: 'short' }, event.timezone).replace('.', '') : '';
              return (
                <Link key={event.id} to={eventPublicPath(event)} className="flex items-center gap-4 border-t border-line py-3.5 last:border-b">
                  <span className="w-14 shrink-0 rounded-lg border border-line py-1.5 text-center">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand">{month}</span>
                    <b className="block font-display text-[22px] leading-none">{day}</b>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[16px] font-bold tracking-tight">{event.title}</span>
                    <span className="mt-0.5 block truncate text-[14px] text-ink-3">{shortPlace(event.location, event.city).label}</span>
                  </span>
                  <span className={`shrink-0 text-[15px] font-semibold ${price.tone === 'free' ? 'text-[#0B7A52]' : ''}`}>{price.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-[28px] font-bold tracking-[-0.03em]">Artistes</h2>
            <Link to="/artists" className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand">Tous les artistes <ArrowRight size={16} /></Link>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-5">
            {artists.map((artist) => (
              <Link key={artist.id} to={`/artists/${artist.slug}`}>
                {artist.photo_url ? (
                  <img src={artist.photo_url} alt="" className="aspect-square w-full rounded-[10px] object-cover object-[50%_25%]" />
                ) : (
                  <span className="relative grid aspect-square place-items-center overflow-hidden rounded-[10px] bg-brand font-display text-[28px] font-bold text-white">
                    <DomePattern variant="tile" />
                    <span className="relative">{artist.name.slice(0, 1)}</span>
                  </span>
                )}
                <p className="mt-2.5 font-display text-[15px] font-bold">{artist.name}</p>
                {artist.genre ? <p className="text-[13px] text-ink-3">{artist.genre}</p> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>

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
