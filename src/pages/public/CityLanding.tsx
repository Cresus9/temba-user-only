import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { MapPin, ArrowLeft, ArrowRight, Calendar, Ticket, Landmark } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import EventCard from '../../components/EventCard';
import PageSEO from '../../components/SEO/PageSEO';
import Image from '../../components/common/Image';
import { pickSpotlightEvents } from '../../utils/eventGeo';
import { formatCurrency, localTodayYmd } from '../../utils/formatters';
import { CITY_LANDINGS, cityBySlug, eventMatchesCity } from '../../data/cityLandings';
import { CATEGORIES } from '../../constants/categories';
import {
  listAttractions,
  ATTRACTION_TYPE_ICONS,
  ATTRACTION_TYPE_LABELS,
} from '../../services/permanentVenueService';
import { eventPublicPath } from '../../utils/eventPath';
import { FadeUp, Stagger, StaggerItem } from '../../components/common/Motion';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export default function CityLanding() {
  const pathname = useLocation().pathname.replace(/\/$/, '') || '/';
  const city = cityBySlug(pathname.slice(1));
  const { events, loading } = useEvents();
  const [attractions, setAttractions] = useState<any[]>([]);
  const [attrLoading, setAttrLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setAttrLoading(true);
    listAttractions()
      .then((rows) => {
        if (cancelled) return;
        setAttractions(rows.filter((a) => eventMatchesCity(a as any, city)));
      })
      .finally(() => {
        if (!cancelled) setAttrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city?.slug]);

  const inCity = useMemo(() => {
    if (!city) return [];
    return events.filter((e) => eventMatchesCity(e, city));
  }, [events, city]);

  const dated = useMemo(
    () => pickSpotlightEvents(inCity.filter((e) => !e.is_permanent), 12, localTodayYmd()),
    [inCity]
  );

  const permanents = useMemo(() => {
    const fromRpc = attractions;
    if (fromRpc.length) return fromRpc.slice(0, 12);
    return inCity.filter((e) => e.is_permanent === true).slice(0, 12);
  }, [attractions, inCity]);

  if (!city) return <Navigate to="/events" replace />;

  const otherCities = CITY_LANDINGS.filter((c) => c.slug !== city.slug);
  const mosaic = [...dated, ...permanents].slice(0, 3);
  const featured = dated[0];
  const rest = dated.slice(1);
  const busy = loading || attrLoading;

  return (
    <div className="min-h-screen bg-cream bg-grain">
      <PageSEO
        title={city.title}
        description={city.description}
        canonicalUrl={`https://tembas.com/${city.slug}`}
        keywords={[
          `billets ${city.name}`,
          `concerts ${city.name}`,
          `attractions ${city.name}`,
          'Temba',
          'billetterie FCFA',
        ]}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: city.title,
          url: `https://tembas.com/${city.slug}`,
          description: city.description,
        }}
      />

      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-24 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-80"
        />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-8 pb-10 md:pt-12 md:pb-14">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-ink mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tous les événements
          </Link>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="eyebrow mb-3">Agenda {city.countryName}</p>
              <h1
                className="text-[clamp(28px,4.4vw,46px)] font-extrabold text-ink leading-[1.06] mb-4 tracking-tight"
                style={{ fontFamily: display }}
              >
                Sortir à{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">{city.name}</span>
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 bottom-1 h-2.5 md:h-3 bg-accent/40 rounded-sm -z-0"
                  />
                </span>
              </h1>
              <p className="text-[15px] text-ink-mute leading-relaxed max-w-xl mb-5">{city.intro}</p>

              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-line text-[12px] font-semibold text-ink">
                  <MapPin className="w-3.5 h-3.5 text-brand" />
                  {city.name}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-line text-[12px] font-semibold text-ink">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  {dated.length} date{dated.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-line text-[12px] font-semibold text-ink">
                  <Landmark className="w-3.5 h-3.5 text-brand" />
                  {permanents.length} attraction{permanents.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {featured && (
                  <Link
                    to={eventPublicPath(featured)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl2 bg-brand text-paper text-[13px] font-bold shadow-card hover:bg-brand-700"
                  >
                    <Ticket className="w-4 h-4" />
                    Voir à l’affiche
                  </Link>
                )}
                <a
                  href="#attractions"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl2 bg-paper border border-line text-[13px] font-bold text-ink hover:border-brand/40"
                >
                  Lieux ouverts
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-mute">
                <span className="font-semibold text-ink">Payer en FCFA</span>
                <img src="/orange-money-seeklogo.png" alt="Orange Money" className="h-6 w-auto" />
                <img src="/moov-money.png" alt="Moov Money" className="h-6 w-auto" />
                <img src="/visa.svg" alt="Visa" className="h-5 w-auto" />
                <img src="/mastercard.svg" alt="Mastercard" className="h-5 w-auto" />
              </div>
            </div>

            <div className="lg:col-span-5 hidden md:block">
              <CityMosaic events={mosaic} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper border-b border-line">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.id}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-cream border border-line text-[13px] font-semibold text-ink hover:border-brand/40"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14 space-y-14">
        <section>
          <FadeUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <p className="eyebrow mb-2">À ne pas manquer</p>
              <h2 className="text-ink" style={{ fontFamily: display }}>
                Prochaines dates
              </h2>
            </div>
            <Link
              to="/events"
              className="self-start md:self-end inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand"
            >
              Tout l’agenda
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>

          {busy && dated.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square rounded-xl2 bg-cream-deep animate-pulse" />
              ))}
            </div>
          ) : dated.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured && (
                <div className="sm:col-span-2 lg:col-span-1">
                  <EventCard {...featured} priority />
                </div>
              )}
              {rest.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-ink-mute bg-paper border border-line rounded-2xl p-5">
              Pas de date unique à {city.name} pour l’instant. Voyez les attractions ci-dessous ou{' '}
              <Link to="/events" className="font-semibold text-brand">
                tout l’agenda
              </Link>
              .
            </p>
          )}
        </section>

        <section id="attractions">
          <FadeUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <p className="eyebrow mb-2">Ouvert toute l’année</p>
              <h2 className="text-ink" style={{ fontFamily: display }}>
                Attractions & lieux ouverts
              </h2>
              <p className="text-[14px] text-ink-mute mt-1">
                Parcs, musées, zoos — réservez une visite à {city.name}, QR à l’entrée.
              </p>
            </div>
            <Link
              to={`/attractions?country=${city.countryCode}`}
              className="self-start md:self-end inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand"
            >
              Toutes les attractions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>

          {attrLoading && permanents.length === 0 ? (
            <div className="flex gap-4 overflow-x-auto md:grid md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex-shrink-0 w-[78vw] md:w-auto rounded-xl2 border border-line overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-cream-deep" />
                  <div className="p-4 h-20 bg-paper" />
                </div>
              ))}
            </div>
          ) : permanents.length > 0 ? (
            <Stagger
              className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
                -mx-4 px-4 md:mx-0 md:px-0
                [&::-webkit-scrollbar]:hidden [scrollbar-width:none]
                md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none"
            >
              {permanents.map((a) => (
                <StaggerItem key={a.id} className="flex-shrink-0 w-[78vw] sm:w-[44vw] md:w-auto snap-start">
                  <AttractionCard attraction={a} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <p className="text-[14px] text-ink-mute bg-paper border border-line rounded-2xl p-5">
              Aucune attraction permanente listée à {city.name} pour l’instant.{' '}
              <Link to="/attractions" className="font-semibold text-brand">
                Voir toutes les attractions
              </Link>
              .
            </p>
          )}
        </section>

        <nav className="pt-2">
          <p className="eyebrow mb-4">Autres villes</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {otherCities.map((c) => (
              <Link
                key={c.slug}
                to={`/${c.slug}`}
                className="group rounded-xl2 border border-line bg-paper p-4 hover:border-brand/40 hover:shadow-card transition-all"
              >
                <p className="text-[15px] font-extrabold text-ink group-hover:text-brand" style={{ fontFamily: display }}>
                  {c.name}
                </p>
                <p className="text-[12px] text-ink-mute mt-1">{c.countryName}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-[12px] font-semibold text-brand">
                  Voir l’agenda
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function CityMosaic({ events }: { events: any[] }) {
  const fallback = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800';
  const slots = [0, 1, 2].map((i) => events[i] || null);
  const slotStyles = [
    { rotate: '-6deg', translate: '0 24px', z: 1 },
    { rotate: '4deg', translate: '40px 0', z: 3 },
    { rotate: '-2deg', translate: '20px 60px', z: 2 },
  ];

  return (
    <div className="relative h-[360px] w-full">
      {slots.map((event, i) => {
        const style = slotStyles[i];
        return (
          <div
            key={event?.id || i}
            className="absolute w-[58%] aspect-[3/4] rounded-2xl overflow-hidden border border-line shadow-pop bg-cream-deep"
            style={{
              left: `${i * 18}%`,
              top: `${i * 8}%`,
              transform: `translate(${style.translate}) rotate(${style.rotate})`,
              zIndex: style.z,
            }}
          >
            <Image
              src={event?.image_url || fallback}
              alt={event?.title || 'Événement'}
              className="w-full h-full object-cover"
              fallbackSrc={fallback}
              width={600}
              height={800}
              quality={85}
            />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-paper/80 mb-0.5">
                {event?.is_permanent ? 'Toute l’année' : 'À l’affiche'}
              </p>
              <p className="text-[13px] font-bold text-paper line-clamp-2">{event?.title || 'Bientôt'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AttractionCard({ attraction: a }: { attraction: any }) {
  const tts = (a.ticket_types ?? []).filter((t: any) => t.sales_enabled !== false && t.available > 0);
  const minPrice = tts.length ? Math.min(...tts.map((t: any) => t.price)) : null;
  const typeIcon = ATTRACTION_TYPE_ICONS[a.attraction_type ?? 'other'] ?? '📍';
  const typeLabel = ATTRACTION_TYPE_LABELS[a.attraction_type ?? 'other'] ?? '';

  return (
    <Link
      to={eventPublicPath(a)}
      className="group flex flex-col rounded-xl2 border border-line bg-paper overflow-hidden shadow-card hover:shadow-brand-sm hover:-translate-y-0.5 transition-all duration-200 h-full"
    >
      <div className="relative aspect-[16/9] sm:aspect-[4/3] bg-cream-deep overflow-hidden flex-shrink-0">
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={a.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-brand-50">
            <span className="text-[44px]">{typeIcon}</span>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-ink/65 backdrop-blur-sm rounded-md">
          <span className="text-[10px]">{typeIcon}</span>
          <span className="text-[9px] font-bold text-paper uppercase tracking-[0.1em]" style={{ fontFamily: mono }}>
            {typeLabel}
          </span>
        </span>
        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-emerald-500 rounded-md">
          <span className="text-[9px] font-bold text-paper uppercase tracking-[0.1em]" style={{ fontFamily: mono }}>
            Ouvert
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3.5 flex-1">
        <h3
          className="text-[13px] font-bold text-ink leading-snug group-hover:text-brand line-clamp-2"
          style={{ fontFamily: display }}
        >
          {a.title}
        </h3>
        {(a.city || a.location) && (
          <p className="flex items-center gap-1 text-[11px] text-ink-mute truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{a.city ?? a.location}</span>
          </p>
        )}
        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold text-brand tabular-nums" style={{ fontFamily: display }}>
            {minPrice !== null ? `Dès ${formatCurrency(minPrice, a.currency ?? 'XOF')}` : 'Voir les tarifs'}
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand/8 text-brand rounded-lg text-[10px] font-bold group-hover:bg-brand group-hover:text-paper">
            <Ticket className="w-3 h-3" />
            Réserver
          </span>
        </div>
      </div>
    </Link>
  );
}
