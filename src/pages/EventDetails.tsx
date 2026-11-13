import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Share2,
  Heart,
  ArrowLeft,
  Navigation,
  Building2,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import BookingForm from '../components/booking/BookingForm';
import EventMap from '../components/events/EventMap';
import Image from '../components/common/Image';
import { geocodeAddress } from '../utils/geocoding';
import { formatEventDateTime, fullAddressDisplay, countryNameFr } from '../utils/eventGeo';
import { formatCalendarDate } from '../utils/formatters';
import { eventPricePresentation, isTicketSellable } from '../utils/labels';
import { queryCache, TTL } from '../utils/queryCache';
import toast from 'react-hot-toast';
import { Event } from '../types/event';
import { eventPublicPath, eventPublicUrl, isEventUuid } from '../utils/eventPath';
import { trackViewContent } from '../lib/metaPixel';
import { ARTIST_ROLE_FR } from '../utils/artistSeo';
import PageSEO from '../components/SEO/PageSEO';
import PermanentBookingPanel from '../components/venue/PermanentBookingPanel';
import GalleryCarousel from '../components/venue/GalleryCarousel';
import DayTypePricingTable from '../components/venue/DayTypePricingTable';
import { ATTRACTION_TYPE_LABELS, getPricingOverrides } from '../services/permanentVenueService';
import { getGalleryImages, type GalleryImage } from '../services/galleryService';
import type { PricingOverride } from '../services/permanentVenueService';

interface EventLocation {
  latitude: number;
  longitude: number;
}

const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'en', 'sur', 'chez', 'pour', 'un', 'une', 'détente', 'visite', 'journée']);

function readableTitle(title: string): string {
  const letters = [...title].filter((char) => /\p{L}/u.test(char));
  const shouting = letters.length > 3 && letters.every((char) => char === char.toLocaleUpperCase('fr') && char !== char.toLocaleLowerCase('fr'));
  if (!shouting) return title;
  let wordIndex = 0;
  return title.split(/(\s+)/).map((part) => {
    if (!/\p{L}/u.test(part)) return part;
    const word = part.toLocaleLowerCase('fr');
    const keepSmall = wordIndex > 0 && SMALL_WORDS.has(word);
    wordIndex += 1;
    if (keepSmall) return word;
    return word.charAt(0).toLocaleUpperCase('fr') + word.slice(1);
  }).join('');
}

interface EventDate {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
}

export default function EventDetails() {
  const { id, eventId } = useParams<{ id?: string; eventId?: string }>();
  const eventIdOrSlug = eventId || id;
  const navigate = useNavigate();
  const route = useLocation();
  const { user } = useAuth();
  const { getEvent } = useEvents();
  const [event,         setEvent]         = useState<Event | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [location,      setLocation]      = useState<EventLocation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [eventDates,    setEventDates]    = useState<EventDate[]>([]);
  const [isSaved,       setIsSaved]       = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [pricingOverrides, setPricingOverrides] = useState<PricingOverride[]>([]);
  const [venue,         setVenue]         = useState<{ id: string; name: string; slug: string | null; city: string | null; verified: boolean; serviceCount: number } | null>(null);

  const viewedContent = useRef<string | null>(null);
  useEffect(() => {
    if (!event?.id || !Array.isArray(event.ticket_types)) return;
    const prices = event.ticket_types
      .map((ticket) => Number(ticket.price))
      .filter((price) => Number.isFinite(price) && price >= 0);
    const value = prices.length ? Math.min(...prices) : 0;
    const key = `${event.id}:${value}`;
    if (viewedContent.current === key) return;
    viewedContent.current = key;
    trackViewContent({ eventId: event.id, value, currency: event.currency });
  }, [event?.id, event?.currency, event?.ticket_types]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!eventIdOrSlug) return;

        // 1. Serve from EventContext in-memory cache first (instant, no network)
        const cached = getEvent(eventIdOrSlug);
        if (cached) {
          setEvent(cached);
          setLoading(false);
          queryCache.invalidate(`event:${cached.id}`);
        } else {
          setLoading(true);
        }

        // 2. Check per-event TTL cache before hitting Supabase
        const cacheKey = `event:${eventIdOrSlug}`;
        const fresh = queryCache.peek<Event>(cacheKey);
        if (fresh && cached && (fresh as any).organizer_profiles) {
          // Cache is fresh AND already has organizer data — skip network
          return;
        }

        // Always fetch fresh from Supabase so we get a new object reference
        // (reusing a cached reference prevents React from re-rendering)
        let eventData: any = null;

        if (!eventData) {
          let query = supabase
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
              )
            `);
          query = isEventUuid(eventIdOrSlug)
            ? query.eq('id', eventIdOrSlug)
            : query.eq('slug', eventIdOrSlug);

          const { data, error } = await query.maybeSingle();

          if (error) throw error;
          if (!data) {
            navigate('/events');
            return;
          }

          if (data.status !== 'PUBLISHED' && !user) {
            navigate('/events');
            return;
          }

          eventData = data;
        }

        const data = eventData as any;

        // Fetch organizer — try organizer_profiles first, fallback to profiles
        const organizerId: string | null = (data as any).organizer_id ?? null;
        if (organizerId) {
          const { data: orgProfile } = await supabase
            .from('organizer_profiles')
            .select('business_name, logo_url, slug, verification_status')
            .eq('organizer_id', organizerId)
            .maybeSingle();

          if (orgProfile) {
            (data as any).organizer_profiles = {
              ...orgProfile,
              verified: orgProfile.verification_status === 'VERIFIED',
            };
          } else {
            // Organizer hasn't set up a business profile yet — use profiles table
            const { data: baseProfile } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('user_id', organizerId)
              .maybeSingle();
            if (baseProfile) {
              (data as any).organizer_profiles = {
                business_name: baseProfile.name,
                logo_url: baseProfile.avatar_url ?? null,
                slug: null,
                verified: false,
              };
            }
          }
        }

        // Fetch artists separately
        const { data: eaData } = await supabase
          .from('event_artists')
          .select('role, display_order, artists(id, name, slug, photo_url, genre, verified)')
          .eq('event_id', data.id)
          .order('display_order');
        if (eaData) (data as any).event_artists = eaData;

        // Fetch venue if the event has one
        const venueId: string | null = (data as any).venue_id ?? null;
        if (venueId) {
          const { data: venueData } = await supabase
            .from('venues')
            .select('id, name, slug, city, verified')
            .eq('id', venueId)
            .maybeSingle();
          if (venueData) {
            // Count active services for this venue
            const { data: svcData } = await supabase
              .rpc('get_venue_services', { p_venue_id: venueId, p_include_inactive: false });
            setVenue({
              ...venueData,
              serviceCount: (svcData ?? []).length,
            });
          }
        }

        // Spread into a new object so React always detects the change
        const enrichedEvent = { ...data };
        queryCache.set(`event:${data.id}`, enrichedEvent, TTL.EVENT_DETAIL);
        if (data.slug) queryCache.set(`event:${data.slug}`, enrichedEvent, TTL.EVENT_DETAIL);
        setEvent(enrichedEvent);
        setLoading(false);

        let { data: datesData, error: datesError } = await supabase
          .from('event_dates')
          .select('id, date, start_time, end_time, status')
          .eq('event_id', data.id)
          .ilike('status', 'active')
          .order('date', { ascending: true });

        if (datesError || !datesData || datesData.length === 0) {
          const { data: allDates } = await supabase
            .from('event_dates')
            .select('id, date, start_time, end_time, status')
            .eq('event_id', data.id)
            .order('date', { ascending: true });

          datesData =
            allDates?.filter(d => d.status && d.status.toLowerCase() === 'active') || [];
        }

        if (datesData && datesData.length > 0) {
          setEventDates(datesData);
        }

        // For permanent attractions, load gallery + pricing overrides early
        // (independent of geocoding so a geocode failure can't block them)
        if (data.is_permanent) {
          const ticketTypeIds = (data.ticket_types ?? []).map((t: any) => t.id);
          try {
            const [gallery, overrides] = await Promise.all([
              getGalleryImages(data.id),
              ticketTypeIds.length ? getPricingOverrides(ticketTypeIds) : Promise.resolve([]),
            ]);
            console.log(`[EventDetails] gallery images: ${gallery.length}, pricing overrides: ${overrides.length}`);
            setGalleryImages(gallery);
            setPricingOverrides(overrides);
          } catch (galleryErr) {
            console.warn('[EventDetails] gallery/pricing fetch failed:', galleryErr);
          }
        }

        try {
          const coordinates = await geocodeAddress(data.location);
          setLocation(coordinates);
        } catch {
          // Non-fatal — map just won't show
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'événement:", err);
        toast.error("Échec du chargement des détails de l'événement");
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventIdOrSlug, user, navigate]);

  useEffect(() => {
    if (!event?.id) return;
    const canonical = eventPublicPath(event);
    if (route.pathname !== canonical) {
      navigate(canonical, { replace: true });
    }
  }, [event, route.pathname, navigate]);

  const eventUrl = useMemo(
    () => (event?.id ? eventPublicUrl(event) : undefined),
    [event]
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
    const startDate = event.is_permanent
      ? undefined
      : event.time ? `${event.date}T${event.time}` : event.date;
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
      organizer: (() => {
        const org = (event as any).organizer_profiles;
        if (org?.business_name) {
          return {
            '@type': 'Organization',
            name: org.business_name,
            url: org.slug ? `https://tembas.com/organizers/${org.slug}` : 'https://tembas.com/',
          };
        }
        return {
          '@type': 'Organization',
          name: 'Temba',
          url: 'https://tembas.com/',
        };
      })(),
      performer: (() => {
        const ea = (event as any).event_artists;
        if (!Array.isArray(ea) || !ea.length) return undefined;
        const artists = ea
          .map((row: any) => row.artists)
          .filter((a: any) => a?.name);
        if (!artists.length) return undefined;
        return artists.map((a: any) => ({
          '@type': 'Person',
          '@id': a.slug ? `https://tembas.com/artists/${a.slug}` : undefined,
          name: a.name,
          url: a.slug ? `https://tembas.com/artists/${a.slug}` : undefined,
        }));
      })(),
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
    (event as any)?.organizer_profiles,
    (event as any)?.event_artists,
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
      ? formatCalendarDate(iso, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }, event?.timezone ?? 'Africa/Ouagadougou')
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
  const geoFormatted = displayDate
    ? formatEventDateTime(displayDate, displayTime, tz)
    : { date: '', time: '', tzLabel: '' };
  const countryCode = event.country_code ?? 'BF';
  const isAbroad = countryCode !== 'BF';
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

      {event.is_permanent ? (
        <section className="bg-white">
          <div className="mx-auto max-w-[1080px] px-5 pb-2 pt-6 sm:px-8">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[13px] text-ink/55">
              <Link to="/attractions" className="hover:text-ink">Attractions</Link>
              <span aria-hidden>/</span>
              <span className="truncate text-ink/80">{readableTitle(event.title)}</span>
            </nav>
            <p className="mt-6 !text-[12px] font-medium uppercase tracking-[0.14em] text-ink/55">
              {ATTRACTION_TYPE_LABELS[event.attraction_type ?? 'other'] ?? 'Attraction'}
            </p>
            <h1 className="mt-1.5 max-w-3xl !text-[clamp(32px,4vw,44px)] !font-semibold !leading-[1.08] !tracking-[-0.035em] text-ink">
              {readableTitle(event.title)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink/65">
              <span>{event.city ?? event.location}</span>
              <button type="button" onClick={handleShare} className="hover:text-ink">Partager</button>
              <button type="button" onClick={toggleSave} className={isSaved ? 'text-brand' : 'hover:text-ink'}>
                {isSaved ? 'Sauvegardé' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className={`bg-white ${event.is_permanent ? '' : 'pb-24 lg:pb-16'}`}>
        <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8 lg:px-10">
          {!event.is_permanent && (
            <nav aria-label="Fil d'Ariane" className="mb-6 flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink-3">
              <Link to="/" className="hover:text-ink">Accueil</Link>
              <span aria-hidden>›</span>
              <Link to="/events" className="hover:text-ink">Événements</Link>
              {event.city ? (<><span aria-hidden>›</span><span>{event.city}</span></>) : null}
              <span aria-hidden>›</span>
              <span className="truncate text-ink">{event.title}</span>
            </nav>
          )}
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
            <div className="min-w-0 space-y-9">
              {!event.is_permanent && (
                <div className="grid items-end gap-6 sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
                  <PosterCard event={event} evtCode={evtCode} />
                  <div>
                    <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[48px]">{event.title}</h1>
                    <div className="mt-5 flex flex-col gap-3 text-[16px]">
                      <p className="flex items-center gap-3">
                        <Calendar className="h-[22px] w-[22px] text-ink-3" />
                        <span><b className="font-semibold">{formatLong(displayDate)}</b>{geoFormatted.time ? ` · ${geoFormatted.time}` : ''}</span>
                      </p>
                      <p className="flex items-center gap-3">
                        <MapPin className="h-[22px] w-[22px] text-ink-3" />
                        <span><b className="font-semibold">{event.location}</b>{event.city && !event.location.toLowerCase().includes(event.city.toLowerCase()) ? ` · ${event.city}` : ''}{countryLabel ? ` · ${countryLabel}` : ''}</span>
                      </p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button type="button" onClick={handleShare} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3.5 text-[14px] font-semibold">
                        <Share2 className="h-4 w-4" /> Partager
                      </button>
                      <button type="button" onClick={toggleSave} className={`inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3.5 text-[14px] font-semibold ${isSaved ? 'text-brand' : ''}`}>
                        <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Sauvegardé' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {event.is_permanent && (
                <PlacePhoto event={event} galleryImages={galleryImages} />
              )}

              <div className={event.is_permanent ? 'border-t border-ink/10 pt-8' : ''}>
                {event.is_permanent ? (
                  <h2 className="mb-3 !text-[18px] !font-semibold !leading-snug text-ink">Le lieu</h2>
                ) : (
                  <>
                    <p className="eyebrow mb-2">À propos</p>
                    <h2 className="text-ink mb-3">L'événement</h2>
                  </>
                )}
                <p className="!text-[15px] !leading-relaxed text-ink/80 whitespace-pre-line">
                  {event.description}
                </p>
              </div>

              {/* Day-type pricing table — permanent attractions only */}
              {event.is_permanent && (event.ticket_types ?? []).length > 0 && (
                <div>
                  <h2 className="mb-3 !text-[18px] !font-semibold !leading-snug text-ink">Tarifs</h2>
                  <div className="border border-ink/10 px-4 py-2">
                    <DayTypePricingTable
                      ticketTypes={event.ticket_types ?? []}
                      overrides={pricingOverrides}
                      currency={event.currency}
                    />
                    {pricingOverrides.length > 0 && (
                      <p className="mt-3 !text-[12px] text-ink/55">
                        Semaine, lun–ven · Week-end, sam–dim · Jours fériés
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Organized by */}
              {(event as any).organizer_profiles && (
                <div>
                  <p className="eyebrow mb-2">Organisateur</p>
                  {(() => {
                    const org = (event as any).organizer_profiles;
                    const inner = (
                      <div className="flex items-center gap-3 py-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-cream border border-line flex-shrink-0 shadow-sm">
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.business_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-brand/10">
                              <span className="text-[16px] font-extrabold text-brand">{org.business_name?.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[16px] font-bold text-brand">{org.business_name}</span>
                      </div>
                    );
                    return org.slug
                      ? <Link to={`/organizers/${org.slug}`} className="hover:opacity-80 transition-opacity">{inner}</Link>
                      : inner;
                  })()}
                </div>
              )}

              {/* Venue */}
              {venue && (
                <div>
                  <p className="eyebrow mb-2">Lieu</p>
                  {venue.slug ? (
                    <Link
                      to={`/venues/${venue.slug}`}
                      className="group flex items-center justify-between gap-3 px-4 py-3 bg-paper border border-line rounded-xl hover:border-brand/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand/10 grid place-items-center flex-shrink-0 group-hover:bg-brand/15 transition-colors">
                          <Building2 className="w-4 h-4 text-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-ink group-hover:text-brand transition-colors truncate flex items-center gap-1.5">
                            {venue.name}
                            {venue.verified && <CheckCircle className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
                          </p>
                          <p className="text-[11px] text-ink-mute">
                            {[venue.city, venue.serviceCount > 0 ? `${venue.serviceCount} service${venue.serviceCount > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-mute flex-shrink-0" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-paper border border-line rounded-xl">
                      <Building2 className="w-4 h-4 text-ink-mute" />
                      <span className="text-[14px] font-semibold text-ink">{venue.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Artists */}
              {(() => {
                const ea = (event as any).event_artists;
                if (!ea || ea.length === 0) return null;
                const artists = [...ea]
                  .sort((a: any, b: any) => (a.display_order ?? 99) - (b.display_order ?? 99))
                  .map((row: any) => ({ ...row.artists, role: row.role }))
                  .filter((a: any) => a?.id);
                if (artists.length === 0) return null;
                return (
                  <div>
                    <p className="eyebrow mb-2">À l&apos;affiche</p>
                    <div className="flex flex-wrap gap-3">
                      {artists.map((artist: any) => (
                        <Link key={artist.id} to={`/artists/${artist.slug}`}
                          className="flex items-center gap-2.5 px-3 py-2 bg-paper border border-line rounded-xl hover:border-brand/40 hover:shadow-sm transition-all">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-cream border border-line flex-shrink-0">
                            {artist.photo_url
                              ? <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full grid place-items-center bg-accent/10"><span className="text-[13px] font-bold text-accent">{artist.name?.charAt(0)}</span></div>}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-ink leading-tight">{artist.name}</p>
                            {artist.role && <p className="text-[10px] text-ink-mute">{ARTIST_ROLE_FR[artist.role] || artist.role}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
              <p className={`pt-4 text-[13px] text-ink/55 ${event.is_permanent ? 'border-t border-ink/10' : 'border-t border-line'}`}>
                Paiement en FCFA · Orange Money, Moov Money, carte · Billet sur le téléphone
              </p>
            </div>

            <div id="billets" className="min-w-0">
              <div className="lg:sticky lg:top-6">
                <BookingPanel
                  event={event}
                  isReviewModalOpen={isReviewModalOpen}
                  setIsReviewModalOpen={setIsReviewModalOpen}
                  evtCode={evtCode}
                  pricingOverrides={pricingOverrides}
                />
              </div>
            </div>
          </div>
        </div>
        {!event.is_permanent && (
          <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-5 py-3 pb-6 shadow-[0_-8px_24px_rgba(3,6,30,0.06)] lg:hidden">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-ink-3">{geoFormatted.time ? `${formatLong(displayDate)}` : 'Billets'}</p>
              <p className="font-display text-[18px] font-bold">{eventPricePresentation(event).label}</p>
            </div>
            <a href="#billets" className="inline-flex h-12 shrink-0 items-center rounded-[10px] bg-brand px-5 text-[15px] font-semibold text-white">
              {eventPricePresentation(event).tone === 'soon' || eventPricePresentation(event).tone === 'soldout' ? 'Voir' : 'Acheter'}
            </a>
          </div>
        )}
      </section>
    </>
  );
}

function PlacePhoto({ event, galleryImages }: { event: Event; galleryImages: GalleryImage[] }) {
  if (galleryImages.length > 0) {
    return (
      <div className="overflow-hidden border border-ink/15 bg-ink/[0.04]">
        <GalleryCarousel
          images={galleryImages}
          fallbackSrc={event.image_url}
          fallbackAlt={readableTitle(event.title)}
          className="aspect-[4/3]"
        />
      </div>
    );
  }
  return (
    <div className="aspect-[4/3] overflow-hidden border border-ink/15 bg-ink/[0.04]">
      {event.image_url ? (
        <img src={event.image_url} alt="" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

/** Poster card with blurred backdrop + EVT code chip. Reused mobile + desktop. */
function PosterCard({ event, evtCode }: { event: Event; evtCode: string }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surf">
      <img
        src={event.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800'}
        alt={`Affiche ${event.title}`}
        className="h-full w-full object-cover"
      />
      <span className="sr-only">EVT {evtCode}</span>
    </div>
  );
}

/** Branded container around the booking form — branches on is_permanent. */
function BookingPanel({
  event,
  isReviewModalOpen,
  setIsReviewModalOpen,
  evtCode,
  pricingOverrides = [],
}: {
  event: Event;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (v: boolean) => void;
  evtCode: string;
  pricingOverrides?: PricingOverride[];
}) {
  const sellable = (event.ticket_types ?? []).filter(isTicketSellable);
  const nothingOnSale = !event.is_permanent && (event.ticket_types ?? []).length > 0 && sellable.length === 0;
  const headerLabel = event.is_permanent
    ? 'Choisir une date'
    : nothingOnSale
      ? 'Bientôt en vente'
      : 'Billets';

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_8px_24px_rgba(3,6,30,0.06)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <span className="font-display text-[20px] font-bold text-ink">{headerLabel}</span>
        {!event.is_permanent && (
          <span
            className="text-[10px] font-bold tabular-nums uppercase tracking-[0.16em] text-ink-mute"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            EVT · {evtCode}
          </span>
        )}
      </div>

      <div className="p-3 sm:p-5">
        {event.status === 'PUBLISHED' || event.status === ('PERMANENT' as any) ? (
          event.is_permanent ? (
            <PermanentBookingPanel
              eventId={event.id}
              currency={event.currency}
              eventTitle={event.title}
              ticketTypes={event.ticket_types ?? []}
              pricingOverrides={pricingOverrides}
            />
          ) : (
            <BookingForm
              eventId={event.id}
              ticketTypes={event.ticket_types || []}
              currency={event.currency}
              onReviewOpen={() => setIsReviewModalOpen(true)}
              onReviewClose={() => setIsReviewModalOpen(false)}
            />
          )
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
