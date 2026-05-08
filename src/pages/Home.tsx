import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { useEvents } from '../context/EventContext';
import HomeSearch from '../components/search/HomeSearch';
import EventCardList from '../components/EventCardList';
import Banner from '../components/home/Banner';
import Features from '../components/home/Features';
import CategoryList from '../components/categories/CategoryList';
import AppDownload from '../components/home/AppDownload';
import HowItWorks from '../components/home/HowItWorks';
import { imagePreloader } from '../utils/imagePreloader';
import PageSEO from '../components/SEO/PageSEO';
import CategoryEventsDisplay from '../components/events/CategoryEventsDisplay';
import UpcomingEvents from '../components/events/UpcomingEvents';
import PopularVenues from '../components/home/PopularVenues';
import Image from '../components/common/Image';

// Hero poster mosaic — three fanned event posters, content-aware
function HeroPosterMosaic({ events }: { events: any[] }) {
  const fallback = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800';
  const slots = [0, 1, 2].map((i) => events[i] || null);

  // Each slot has its own transform so they fan out organically.
  const slotStyles = [
    { rotate: '-6deg',  translate: '0 24px',   z: 1 },
    { rotate: '4deg',   translate: '40px 0',   z: 3 },
    { rotate: '-2deg',  translate: '20px 60px',z: 2 },
  ];

  return (
    <div className="relative h-[360px] w-full">
      {/* Floating "ticket sold" pill */}
      <div className="absolute -top-1 -left-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-paper border border-line shadow-card">
        <span className="grid place-items-center w-5 h-5 rounded-full bg-accent text-paper text-[10px] font-bold">✓</span>
        <span className="text-[11px] font-semibold text-ink">Billet réservé en 30s</span>
      </div>

      {/* Floating "live" pill */}
      <div className="absolute bottom-1 -right-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-brand text-paper shadow-card">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
        </span>
        <span className="text-[11px] font-semibold">42 réservations cette heure</span>
      </div>

      {slots.map((event, i) => {
        const style = slotStyles[i];
        const left = `${i * 18}%`;
        const top  = `${i * 8}%`;
        return (
          <div
            key={event?.id || i}
            className="absolute w-[58%] aspect-[3/4] rounded-2xl overflow-hidden border border-line shadow-pop bg-cream-deep"
            style={{
              left, top,
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
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-paper/80 mb-1">
                {event ? 'À l’affiche' : 'Bientôt'}
              </p>
              <p className="text-[14px] font-bold text-paper line-clamp-1 leading-tight" style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>
                {event?.title || 'Festival des Arts'}
              </p>
              {event && (
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-paper/75">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{event.location}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { featuredEvents } = useEvents();

  // Preload featured event images for instant loading
  useEffect(() => {
    if (featuredEvents && featuredEvents.length > 0) {
      // Preload first 6 featured event images
      const imagesToPreload = featuredEvents
        .slice(0, 6)
        .filter(event => event.image_url)
        .map(event => ({ image_url: event.image_url, title: event.title }));

      if (imagesToPreload.length > 0) {
        console.log('🚀 Preloading', imagesToPreload.length, 'featured event images...');
        imagePreloader.preloadEventImages(imagesToPreload);
      }
    }
  }, [featuredEvents]);

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Temba',
        url: 'https://tembas.com/',
        logo: 'https://tembas.com/temba-app.png',
        sameAs: [
          'https://www.facebook.com/temba',
          'https://www.instagram.com/temba',
          'https://www.linkedin.com/company/temba',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Temba',
        url: 'https://tembas.com/',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://tembas.com/events?query={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
    []
  );

  return (
    <div>
      <PageSEO
        title="Billetterie d’événements au Burkina Faso"
        description="Achetez vos billets en ligne pour des concerts, festivals et événements culturels au Burkina Faso. Paiement sécurisé en FCFA, transferts instantanés et support local."
        canonicalUrl="https://tembas.com/"
        ogImage="https://tembas.com/temba-app.png"
        keywords={[
          'billets Burkina Faso',
          'billetterie en ligne',
          'événements à Ouagadougou',
          'concerts Burkina Faso',
          'festivals Afrique de l’Ouest',
        ]}
        structuredData={structuredData}
      />
      {/* Banner Section */}
      <Banner />

      {/* ───── Hero ───── */}
      <section className="relative bg-cream bg-grain overflow-hidden">
        {/* Soft brand glows — subtle */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-24 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-80"
        />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-10 md:pt-14 md:pb-14">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Copy + search */}
            <div className="lg:col-span-7">
              <p className="eyebrow mb-3">
                Billetterie · Afrique de l'Ouest
              </p>
              <h1 className="!text-[clamp(28px,4.6vw,46px)] !leading-[1.06] text-ink mb-4">
                Vibrez avec les événements{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">qui comptent</span>
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 bottom-1 h-2.5 md:h-3 bg-accent/40 rounded-sm -z-0"
                  />
                </span>
                .
              </h1>
              <p className="text-[15px] text-ink-mute max-w-xl mb-6 leading-relaxed">
                Concerts, festivals et expériences culturelles en Afrique de l'Ouest.
                Achetez en FCFA, transférez en un clic.
              </p>

              <HomeSearch />

              {/* Trust strip — compact */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-mute">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1">
                    {['#C68A1F', '#3D3FE2', '#14172A'].map((c) => (
                      <span
                        key={c}
                        className="w-5 h-5 rounded-full border-2 border-cream"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <span><span className="font-semibold text-ink">+10 000</span> billets vendus</span>
                </div>
                <div className="hidden sm:block w-px h-3.5 bg-line" />
                <div className="flex items-center gap-1.5">
                  <span className="text-accent text-[11px]">★★★★★</span>
                  <span><span className="font-semibold text-ink">4,8/5</span></span>
                </div>
                <div className="hidden sm:block w-px h-3.5 bg-line" />
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-50 text-brand text-[9px] font-bold">✓</span>
                  <span>Paiement <span className="font-semibold text-ink">en FCFA</span></span>
                </div>
              </div>
            </div>

            {/* Poster mosaic */}
            <div className="lg:col-span-5 hidden lg:block">
              <HeroPosterMosaic events={featuredEvents?.slice(0, 3) || []} />
            </div>
          </div>
        </div>
      </section>

      {/* ───── Événements à la une ───── */}
      <section className="section-normal bg-paper">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div className="max-w-2xl">
              <p className="eyebrow mb-2">À l'affiche</p>
              <h2 className="text-ink mb-2">Événements à la une</h2>
              <p className="text-[14px] text-ink-mute">
                Sélectionnés pour vous : concerts, festivals et soirées que vous n'avez pas envie de manquer.
              </p>
            </div>
            <Link
              to="/events"
              className="self-start md:self-end text-[14px] font-semibold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5"
            >
              Tout voir
              <span aria-hidden>→</span>
            </Link>
          </div>
          <EventCardList featured={true} limit={9} showNavigation={true} />
        </div>
      </section>

      {/* ───── Bientôt + catégories + venues sur surface cream ───── */}
      <section className="section-normal surface-cream">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 space-y-10 md:space-y-12">
          <UpcomingEvents limit={6} />

          <CategoryEventsDisplay
            searchQuery=""
            locationFilter=""
            dateFilter=""
          />

          <PopularVenues />
        </div>
      </section>

      {/* ───── Catégories populaires ───── */}
      <section className="section-normal bg-paper">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="max-w-2xl mb-6">
            <p className="eyebrow mb-2">Explorer</p>
            <h2 className="text-ink mb-2">Catégories populaires</h2>
            <p className="text-[14px] text-ink-mute">
              Concerts, festivals, sport, culture — trouvez l'événement qui vous ressemble.
            </p>
          </div>
          <CategoryList />
        </div>
      </section>

      <HowItWorks />
      <Features />
      <AppDownload />
    </div>
  );
}