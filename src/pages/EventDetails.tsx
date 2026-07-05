import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Share2,
  Heart,
  ArrowLeft,
  Navigation,
  ShieldCheck,
  Zap,
  Banknote,
} from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import BookingForm from '../components/booking/BookingForm';
import EventMap from '../components/events/EventMap';
import Image from '../components/common/Image';
import { geocodeAddress } from '../utils/geocoding';
import { formatEventDateTime, fullAddressDisplay, countryFlag, countryNameFr } from '../utils/eventGeo';
import { queryCache, TTL } from '../utils/queryCache';
import toast from 'react-hot-toast';
import { Event } from '../types/event';
import PageSEO from '../components/SEO/PageSEO';

interface EventLocation {
  latitude: number;
  longitude: number;
}

interface EventDate {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEvent } = useEvents();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [eventDates, setEventDates] = useState<EventDate[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!id) return;

        // 1. Serve from EventContext in-memory cache first (instant, no network)
        const cached = getEvent(id);
        if (cached) {
          setEvent(cached);
          setLoading(false);
          // Still revalidate in background so ticket availability is fresh
          queryCache.invalidate(`event:${id}`);
        } else {
          setLoading(true);
        }

        // 2. Check per-event TTL cache before hitting Supabase
        const cacheKey = `event:${id}`;
        const fresh = queryCache.peek<Event>(cacheKey);
        if (fresh && cached) {
          // Already served from context AND per-event cache is fresh — skip network
          return;
        }

        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            ticket_types (
              id,
              name,
              description,
              price,
              quantity,
              available,
              max_per_order,
              sales_enabled
            ),
            organizer_profiles (
              business_name,
              logo_url,
              slug,
              verified
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data.status !== 'PUBLISHED' && !user) {
          navigate('/events');
          return;
        }

        // Cache this event individually for fast back-navigation
        queryCache.set(`event:${id}`, data, TTL.EVENT_DETAIL);
        setEvent(data);
        setLoading(false);

        let { data: datesData, error: datesError } = await supabase
          .from('event_dates')
          .select('id, date, start_time, end_time, status')
          .eq('event_id', id)
          .ilike('status', 'active')
          .order('date', { ascending: true })
          .order('display_order', { ascending: true });

        if (datesError || !datesData || datesData.length === 0) {
          const { data: allDates } = await supabase
            .from('event_dates')
            .select('id, date, start_time, end_time, status')
            .eq('event_id', id)
            .order('date', { ascending: true });

          datesData =
            allDates?.filter(d => d.status && d.status.toLowerCase() === 'active') || [];
        }

        if (datesData && datesData.length > 0) {
          setEventDates(datesData);
        }

        const coordinates = await geocodeAddress(data.location);
        setLocation(coordinates);
      } catch (err) {
        console.error("Erreur lors du chargement de l'événement:", err);
        toast.error("Échec du chargement des détails de l'événement");
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, user, navigate]);

  const eventUrl = useMemo(
    () => (event?.id ? `https://tembas.com/events/${event.id}` : undefined),
    [event?.id]
  );

  const ogImage = useMemo(() => {
    if (!event?.image_url) return undefined;
    return event.image_url.startsWith('http')
      ? event.image_url
      : `https://tembas.com${event.image_url}`;
  }, [event?.image_url]);

  const eventSchema = useMemo(() => {
    if (!event || !eventUrl) return undefined;
    const tz = event.timezone ?? 'Africa/Ouagadougou';
    const startDate = event.time ? `${event.date}T${event.time}` : event.date;
    const addressDisplay = fullAddressDisplay(event);
    const countryCode = event.country_code ?? 'BF';
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate,
      eventStatus: 'https://schema.org/EventScheduled',
      image: ogImage ? [ogImage] : undefined,
      location: {
        '@type': 'Place',
        name: event.location,
        address: {
          '@type': 'PostalAddress',
          streetAddress: event.address ?? event.location,
          addressLocality: event.city ?? event.location,
          addressRegion: event.region ?? undefined,
          addressCountry: countryCode,
        },
      },
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      ...(tz !== 'Africa/Ouagadougou' && { inLanguage: 'fr' }),
      organizer: {
        '@type': 'Organization',
        name: 'Temba',
        url: 'https://tembas.com/',
      },
      offers: (event.ticket_types || []).map(ticketType => ({
        '@type': 'Offer',
        url: eventUrl,
        price: ticketType.price,
        priceCurrency: event.currency,
        availability:
          ticketType.available && ticketType.available > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
      })),
    };
  }, [
    event?.title,
    event?.description,
    event?.time,
    event?.date,
    event?.location,
    event?.address,
    event?.city,
    event?.region,
    event?.country_code,
    event?.timezone,
    event?.ticket_types,
    event?.currency,
    eventUrl,
    ogImage,
  ]);

  const breadcrumbSchema = useMemo(() => {
    if (!eventUrl || !event?.title) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://tembas.com/' },
        { '@type': 'ListItem', position: 2, name: 'Événements', item: 'https://tembas.com/events' },
        { '@type': 'ListItem', position: 3, name: event.title, item: eventUrl },
      ],
    };
  }, [event?.title, eventUrl]);

  const structuredData = useMemo(() => {
    const data = [];
    if (breadcrumbSchema) data.push(breadcrumbSchema);
    if (eventSchema) data.push(eventSchema);
    return data.length ? data : undefined;
  }, [breadcrumbSchema, eventSchema]);

  const description = useMemo(() => {
    if (!event) return undefined;
    return (
      event.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
      `Achetez vos billets pour ${event.title} à ${event.location}.`
    );
  }, [event?.description, event?.title, event?.location]);

  const formatLong = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

  const handleShare = async () => {
    if (!event) return;
    const shareData = {
      title: event.title,
      text: `${event.title} — ${event.location}`,
      url: eventUrl ?? window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Lien copié');
      }
    } catch {
      // user cancelled
    }
  };

  const toggleSave = () => {
    setIsSaved(prev => !prev);
    toast.success(isSaved ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-3 w-32 bg-cream-deep rounded animate-pulse" />
            <div className="h-12 w-full bg-cream-deep rounded animate-pulse" />
            <div className="h-12 w-3/4 bg-cream-deep rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-cream-deep rounded animate-pulse mt-4" />
            <div className="h-4 w-1/2 bg-cream-deep rounded animate-pulse" />
          </div>
          <div className="lg:col-span-5 aspect-[3/4] bg-cream-deep rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 px-4">
        <p className="eyebrow !text-ink-mute mb-2">404</p>
        <h2 className="text-ink mb-3">Événement introuvable</h2>
        <p className="text-[14px] text-ink-mute mb-6">
          Cet événement n'existe plus, ou le lien est cassé.
        </p>
        <Link to="/events" className="btn btn-primary">Voir tous les événements</Link>
      </div>
    );
  }

  const displayDate = eventDates.length > 0 && eventDates[0]?.date
    ? eventDates[0].date
    : event.date;
  const displayTime = eventDates.length > 0 && eventDates[0]?.start_time
    ? eventDates[0].start_time
    : event.time;
  const evtCode = event.id ? event.id.slice(0, 8).toUpperCase() : '—';

  const tz = event.timezone ?? 'Africa/Ouagadougou';
  const geoFormatted = formatEventDateTime(displayDate, displayTime, tz);
  const countryCode = event.country_code ?? 'BF';
  const isAbroad = countryCode !== 'BF';
  const flag = isAbroad ? countryFlag(countryCode) : null;
  const countryLabel = isAbroad ? countryNameFr(countryCode) : null;

  return (
    <>
      {eventUrl && (
        <PageSEO
          title={event.title}
          description={description}
          canonicalUrl={eventUrl}
          ogType="event"
          ogImage={ogImage}
          keywords={[
            event.title,
            event.location,
            'billets',
            'événement Burkina Faso',
            'sortir à Ouagadougou',
          ]}
          structuredData={structuredData}
        />
      )}

      {/* — — — Compact title band (cream) — — — */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-brand-50 blur-3xl opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-24 w-[260px] h-[260px] rounded-full bg-accent-50 blur-3xl opacity-50"
        />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-4 pb-5 md:pt-5 md:pb-6">
          {/* Breadcrumb */}
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1.5 text-[12px] text-ink-mute mb-3 truncate"
          >
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </button>
            <span aria-hidden className="text-line">/</span>
            <Link to="/events" className="hover:text-ink transition-colors">Événements</Link>
            <span aria-hidden className="text-line">/</span>
            <span className="text-ink/85 truncate">{event.title}</span>
          </nav>

          <p className="eyebrow mb-1.5">
            <span
              className="tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              EVT · {evtCode}
            </span>
            <span className="mx-2 text-ink/40">·</span>
            {formatLong(displayDate)}
          </p>

          <h1 className="!text-[clamp(22px,3.4vw,36px)] !leading-[1.06] text-ink mb-3 tracking-tight max-w-3xl">
            {event.title}
          </h1>

          {/* Meta + actions inline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink">
            {eventDates.length > 1 ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent" />
                <span className="font-semibold">{eventDates.length} dates</span>
              </span>
            ) : (
              <>
                {displayTime && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-accent" />
                    <span>{geoFormatted.time}</span>
                    {isAbroad && (
                      <span className="text-[11px] text-ink-mute">({geoFormatted.tzLabel})</span>
                    )}
                  </span>
                )}
              </>
            )}
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
              <span className="truncate">{event.city ?? event.location}</span>
              {flag && (
                <span className="flex-shrink-0" aria-label={countryLabel ?? countryCode}>
                  {flag}
                </span>
              )}
            </span>
            {isAbroad && countryLabel && (
              <span className="text-[12px] text-ink-mute hidden sm:inline">
                {countryLabel}
              </span>
            )}

            <span aria-hidden className="hidden sm:block w-px h-4 bg-line" />

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-brand transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Partager
            </button>
            <button
              onClick={toggleSave}
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                isSaved ? 'text-brand' : 'text-ink-mute hover:text-brand'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </section>

      {/* — — — Body: poster+desc on left, booking sticky on right — — — */}
      <section className="bg-paper">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-7 md:py-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">
            {/* — Mobile: poster first, then booking, then content — */}
            <div className="lg:hidden space-y-5">
              <PosterCard event={event} evtCode={evtCode} />
              <BookingPanel
                event={event}
                isReviewModalOpen={isReviewModalOpen}
                setIsReviewModalOpen={setIsReviewModalOpen}
                evtCode={evtCode}
              />
            </div>

            {/* — Left: description + map — */}
            <div className="lg:col-span-7 space-y-9">
              {/* Desktop poster lives in the LEFT column for visual anchor */}
              <div className="hidden lg:block">
                <PosterCard event={event} evtCode={evtCode} />
              </div>

              <div>
                <p className="eyebrow mb-2">À propos</p>
                <h2 className="text-ink mb-3">L'événement</h2>
                <p className="text-[15px] text-ink/80 whitespace-pre-line leading-relaxed">
                  {event.description}
                </p>
              </div>

              {/* Organized by */}
              {(event as any).organizer_profiles && (
                <div>
                  <p className="eyebrow mb-2">Organisateur</p>
                  {(() => {
                    const org = (event as any).organizer_profiles;
                    const orgSlug = org.slug;
                    const inner = (
                      <div className="flex items-center gap-3 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 hover:shadow-card transition-all">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-cream border border-line flex-shrink-0">
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.business_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-brand/10">
                              <span className="text-[18px] font-extrabold text-brand">{org.business_name?.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-bold text-ink">{org.business_name}</span>
                            {org.verified && (
                              <svg className="w-3.5 h-3.5 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <p className="text-[12px] text-ink-mute">Voir tous ses événements →</p>
                        </div>
                      </div>
                    );
                    return orgSlug
                      ? <Link to={`/organizers/${orgSlug}`}>{inner}</Link>
                      : inner;
                  })()}
                </div>
              )}

              {location && (
                <div>
                  <p className="eyebrow mb-2">Lieu</p>
                  <h2 className="text-ink mb-3">Comment y aller</h2>
                  <div className="rounded-xl2 overflow-hidden border border-line bg-cream-deep">
                    <EventMap
                      latitude={location.latitude}
                      longitude={location.longitude}
                      title={event.title}
                      address={fullAddressDisplay(event)}
                      className="h-[280px]"
                      isDisabled={isReviewModalOpen}
                      isModalOpen={isReviewModalOpen}
                    />
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-cream rounded-xl2 border border-line">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <MapPin className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink truncate">{fullAddressDisplay(event)}</p>
                        <p className="text-[11px] text-ink-mute">Lieu de l'événement</p>
                      </div>
                    </div>
                    <a
                      href={
                        location
                          ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-ink text-paper rounded-lg text-[12px] font-bold hover:bg-brand transition-colors flex-shrink-0"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Itinéraire
                    </a>
                  </div>
                </div>
              )}

              {/* Trust strip — moved here, no longer in hero */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4 border-t border-line text-[12px] text-ink-mute">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                  Paiement sécurisé en FCFA
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  E-billet instantané
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-ink" />
                  Mobile Money · Carte
                </span>
              </div>
            </div>

            {/* — Right: sticky booking — */}
            <div className="hidden lg:block lg:col-span-5">
              <div className="lg:sticky lg:top-20">
                <BookingPanel
                  event={event}
                  isReviewModalOpen={isReviewModalOpen}
                  setIsReviewModalOpen={setIsReviewModalOpen}
                  evtCode={evtCode}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Poster card with blurred backdrop + EVT code chip. Reused mobile + desktop. */
function PosterCard({ event, evtCode }: { event: Event; evtCode: string }) {
  return (
    <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:aspect-[5/4] rounded-2xl overflow-hidden border border-line shadow-card bg-ink">
      {event.image_url && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center scale-[1.2] blur-3xl saturate-150 opacity-95"
          style={{ backgroundImage: `url(${event.image_url})` }}
        />
      )}
      <Image
        src={event.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200'}
        alt={event.title}
        className="absolute inset-0 w-full h-full object-contain"
        width={1200}
        height={900}
        quality={88}
        priority
      />
      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-ink/65 backdrop-blur-sm border border-paper/15">
        <span
          className="text-[10px] font-bold text-paper/90 uppercase tracking-[0.16em]"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
        >
          EVT · {evtCode}
        </span>
      </div>
    </div>
  );
}

/** Branded container around the BookingForm — no logic changes inside. */
function BookingPanel({
  event,
  isReviewModalOpen,
  setIsReviewModalOpen,
  evtCode,
}: {
  event: Event;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (v: boolean) => void;
  evtCode: string;
}) {
  return (
    <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
      {/* Ticket-style header */}
      <div className="flex items-center justify-between px-5 py-3 bg-cream border-b border-line">
        <span className="eyebrow !text-ink">Réserver</span>
        <span
          className="text-[10px] font-bold tabular-nums uppercase tracking-[0.16em] text-ink-mute"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
        >
          EVT · {evtCode}
        </span>
      </div>

      <div className="p-5">
        {event.status === 'PUBLISHED' ? (
          <BookingForm
            eventId={event.id}
            ticketTypes={event.ticket_types || []}
            currency={event.currency}
            onReviewOpen={() => setIsReviewModalOpen(true)}
            onReviewClose={() => setIsReviewModalOpen(false)}
          />
        ) : (
          <div className="text-center py-6">
            <p className="text-[14px] text-ink-mute">
              Cet événement n'est actuellement pas disponible pour la réservation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
