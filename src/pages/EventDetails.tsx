import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  CalendarBlank,
  CaretRight,
  ChatCircle,
  Clock,
  Copy,
  DeviceMobile,
  CreditCard,
  MapPin,
  SealCheck,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { displayVenue, mapsSearchUrl, shortPlace } from '../utils/eventGeo';
import { formatCalendarDate } from '../utils/formatters';
import { queryCache, TTL } from '../utils/queryCache';
import toast from 'react-hot-toast';
import { Event } from '../types/event';
import { canonicalEventTarget, eventPublicPath, eventPublicUrl, isEventUuid } from '../utils/eventPath';
import { trackViewContent } from '../lib/metaPixel';
import { ARTIST_ROLE_FR } from '../utils/artistSeo';
import PageSEO from '../components/SEO/PageSEO';
import NotFound from './NotFound';
import { buildEventJsonLd } from '../../netlify/edge-functions/lib/eventJsonLd';
import { eventDaySpan, eventSeoTitle, frDayRange } from '../../netlify/edge-functions/lib/eventSeo';
import { eventShareDescription } from '../../netlify/edge-functions/lib/eventOgShare';
import { flyerSrcSet, resizedImageUrl } from '../utils/imageUrl';
import EventTicketPanel, { heroPriceLine, hoursLine, ticketMode } from '../components/events/EventTicketPanel';
import DisplayCard from '../components/events/DisplayCard';
import AppBand from '../components/design/AppBand';
import OpenInAppBanner from '../components/events/OpenInAppBanner';
import { useEventSchedule } from '../hooks/useEventSchedule';
import { calendarDayInZone, formatEventTime } from '../utils/formatters';
import { cityKey, cityName, dedupeEvents, eventBadges, isPastSpan, spanFor } from '../utils/eventDisplay';
import { categoryLabelFr } from '../utils/labels';

interface EventDate {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  capacity?: number | null;
  tickets_sold?: number | null;
}

export default function EventDetails() {
  const { id, eventId } = useParams<{ id?: string; eventId?: string }>();
  const eventIdOrSlug = eventId || id;
  const navigate = useNavigate();
  const route = useLocation();
  const { user } = useAuth();
  const { getEvent, filteredEvents } = useEvents();
  const { kinds } = useEventSchedule(filteredEvents ?? []);
  const [event,         setEvent]         = useState<Event | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [eventDates,    setEventDates]    = useState<EventDate[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [missing,       setMissing]       = useState(false);
  // Resized flyer failed: show the original file instead.
  const [heroOriginal, setHeroOriginal] = useState(false);
  // Keeps the flyer's space while it downloads so the title does not jump.
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [venue,         setVenue]         = useState<{ id: string; name: string; slug: string | null; city: string | null; verified: boolean; serviceCount: number } | null>(null);

  // Another event's flyer starts fresh.
  useEffect(() => {
    setHeroOriginal(false);
    setHeroLoaded(false);
  }, [event?.image_url]);

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
        const lookup = eventIdOrSlug?.trim() ?? '';
        // An empty slug becomes `events?slug=eq.` and the request fails.
        if (!lookup) return;

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
          query = isEventUuid(lookup)
            ? query.eq('id', lookup)
            : query.eq('slug', lookup);

          const { data, error } = await query.maybeSingle();

          if (error) throw error;
          // Unknown or unpublished: show the real 404 page (noindex) on this URL
          // instead of bouncing to /events, which Google reads as a soft 404.
          if (!data || (data.status !== 'PUBLISHED' && !user)) {
            setEvent(null);
            setMissing(true);
            setLoading(false);
            return;
          }
          setMissing(false);

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
              .from('public_profiles')
              .select('name, avatar_url')
              .eq('user_id', organizerId)
              .maybeSingle();
            if (baseProfile) {
              (data as any).organizer_profiles = {
                business_name: baseProfile.name,
                logo_url: baseProfile.avatar_url ?? null,
                slug: null,
                verified: false,
                // Personal account name, not a business profile: shown on the
                // page as today, but kept out of the Event JSON-LD.
                fromBaseProfile: true,
              };
            }
          }
        }

        // Fetch artists separately
        // Confirmed lineup only (also enforced by the public read policy).
        const lineupSelect = 'role, display_order, artists(id, name, slug, photo_url, genre, verified)';
        let { data: eaData, error: eaError } = await supabase
          .from('event_artists')
          .select(lineupSelect)
          .eq('event_id', data.id)
          .eq('status', 'confirmed')
          .order('display_order');
        if (eaError) {
          // Before the lineup migration there is no status column.
          ({ data: eaData } = await supabase
            .from('event_artists')
            .select(lineupSelect)
            .eq('event_id', data.id)
            .order('display_order'));
        }
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

        const datesResult = await supabase
          .from('event_dates')
          .select('id, date, start_time, end_time, status, capacity, tickets_sold')
          .eq('event_id', data.id)
          .ilike('status', 'active')
          .order('date', { ascending: true });

        let datesData = datesResult.data;
        const datesError = datesResult.error;

        if (datesError || !datesData || datesData.length === 0) {
          const { data: allDates } = await supabase
            .from('event_dates')
            .select('id, date, start_time, end_time, status, capacity, tickets_sold')
            .eq('event_id', data.id)
            .order('date', { ascending: true });

          datesData =
            allDates?.filter(d => d.status && d.status.toLowerCase() === 'active') || [];
        }

        if (datesData && datesData.length > 0) {
          setEventDates(datesData);
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
    const target = canonicalEventTarget(route.pathname, route.search, route.hash, eventPublicPath(event));
    if (target) navigate(target, { replace: true });
  }, [event, route.hash, route.pathname, route.search, navigate]);

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
    const org = (event as any).organizer_profiles;
    const ea = (event as any).event_artists;
    const performers = Array.isArray(ea)
      ? ea.map((row: any) => row.artists).filter((a: any) => a?.name).map((a: any) => ({ name: a.name, slug: a.slug }))
      : [];
    return buildEventJsonLd(event as any, {
      url: eventUrl,
      image: ogImage ?? null,
      organizer: org?.business_name && !org.fromBaseProfile
        ? { name: org.business_name, url: org.slug ? `https://tembas.com/organizers/${org.slug}` : null }
        : null,
      venue: venue ? { name: venue.name, city: venue.city } : null,
      performers,
      dates: eventDates,
    });
  }, [event, eventUrl, ogImage, venue, eventDates]);

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

  // "Alif Naaba — Ouagadougou, 26 décembre 2026": same title as the crawler HTML.
  const seoTitle = useMemo(() => (event ? eventSeoTitle(event as any, eventDates) : undefined), [event, eventDates]);

  const description = useMemo(() => {
    if (!event) return undefined;
    const span = eventDaySpan(event as any, eventDates);
    const when = event.is_permanent ? 'Ouvert toute l’année' : span.first ? frDayRange(span.first, span.last) : '';
    return eventShareDescription({
      title: event.title,
      description: event.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      dateLabel: when,
      location: shortPlace(event.location, event.city).label,
    });
  }, [event, eventDates]);

  const shareWhatsApp = () => {
    if (!event) return;
    const url = eventUrl ?? window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${event.title} ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl ?? window.location.href);
      toast.success('Lien copié');
    } catch {
      toast.error('Le lien n’a pas pu être copié');
    }
  };

  const addToCalendar = () => {
    if (!event) return;
    const start = `${(event.date || '').replace(/-/g, '')}T${(formatEventTime(event.time) || '20:00').replace(':', '')}00`;
    const place = displayVenue(event.location, event.city).label;
    const href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${start}&location=${encodeURIComponent(place)}&details=${encodeURIComponent(eventUrl || '')}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      // Holds the screen while the event loads so the footer does not jump up and down.
      <div className="mx-auto min-h-[100vh] max-w-[1200px] px-5 py-16">
        <div className="h-8 w-48 animate-pulse rounded bg-surf" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surf" />
      </div>
    );
  }

  if (!event && missing) return <NotFound />;

  if (!event) {
    return (
      <div className="px-4 py-20 text-center">
        <h2 className="font-display text-[28px] font-bold text-ink">Événement introuvable</h2>
        <Link to="/events" className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-brand px-5 text-[15px] font-semibold text-white">Voir les événements</Link>
      </div>
    );
  }

  const tz = 'Africa/Ouagadougou';
  const place = displayVenue(event.location, event.city || venue?.city);
  const mode = ticketMode(event, eventDates);
  const span = spanFor(event, eventDates.length ? { dates: eventDates.map((row) => row.date), min: '', max: '' } : null);
  const badges = eventBadges(event, span);
  const kind = kinds.get(event.id);
  const kindLabel = kind === 'concert' ? 'Concert' : kind === 'festival' ? 'Festival' : kind === 'cinema' ? 'Cinéma' : event.is_permanent ? 'Attraction' : '';
  const when = event.is_permanent
    ? 'Ouvert tous les jours'
    : formatCalendarDate(eventDates[0]?.date || event.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, tz);
  const clock = formatEventTime(eventDates[0]?.start_time || event.time);
  const artists = ([...((event as any).event_artists || [])] as any[])
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))
    .map((row) => ({ ...row.artists, role: row.role }))
    .filter((artist) => artist?.id);
  const org = (event as any).organizer_profiles;
  const city = cityName(cityKey(event)) || place.city || 'Ouagadougou';
  const titleKey = event.title.toLowerCase().replace(/\s+/g, ' ').trim();
  const sameShow = (title: string) => {
    const other = title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (other === titleKey) return true;
    const [short, long] = titleKey.length < other.length ? [titleKey, other] : [other, titleKey];
    return short.length > 12 && long.startsWith(short);
  };
  const related = dedupeEvents(filteredEvents ?? [])
    .filter((item) => item.id !== event.id && !sameShow(item.title))
    .filter((item) => cityKey(item) === cityKey(event))
    .filter((item) => !kind || kinds.get(item.id) === kind || kind === 'other')
    .filter((item) => item.is_permanent || !isPastSpan(spanFor(item), calendarDayInZone(tz)))
    .slice(0, 8);
  const maps = mapsSearchUrl([place.venue, place.city].filter(Boolean).join(' '));

  return (
    <div className="min-w-0 bg-white pb-24 lg:pb-0">
      {eventUrl && (
        <PageSEO
          title={seoTitle || event.title}
          description={description}
          canonicalUrl={eventUrl}
          ogType="event"
          ogImage={ogImage}
          structuredData={structuredData}
        />
      )}

      <section className="relative overflow-hidden bg-[#14162B] text-white">
        {event.image_url && (
          <img
            src={(!heroOriginal && resizedImageUrl(event.image_url, 64, 50)) || event.image_url}
            onError={() => setHeroOriginal(true)}
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-[40px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#14162B] via-[#14162B]/75 to-[#14162B]/40" />
        <div className="relative px-5 py-6 min-[1280px]:px-16 min-[1280px]:py-8 min-[1440px]:px-20 lg:pr-[460px]">
          <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/70">
            <Link to="/" className="hover:text-white">Accueil</Link>
            <CaretRight size={12} />
            <Link to="/events" className="hover:text-white">Événements</Link>
            {place.city && (<><CaretRight size={12} /><span>{place.city}</span></>)}
            <CaretRight size={12} />
            <span className="truncate text-white">{event.title}</span>
          </nav>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
            <img
              src={event.image_url || ''}
              srcSet={heroOriginal ? undefined : flyerSrcSet(event.image_url, [360, 480, 640, 960, 1280])}
              sizes="(min-width: 640px) 340px, 100vw"
              onLoad={() => setHeroLoaded(true)}
              onError={() => (heroOriginal ? setHeroLoaded(true) : setHeroOriginal(true))}
              alt={`Affiche ${event.title}`}
              className={`max-h-[340px] w-auto max-w-full rounded-[10px] object-contain sm:max-h-[425px] sm:max-w-[340px] ${heroLoaded ? '' : 'min-h-[340px] sm:min-h-[425px]'}`} />
            <div className="min-w-0 pb-1 text-white [&_h1]:!text-white [&_p]:!text-white">
              <div className="flex flex-wrap items-center gap-2">
                {badges.map((badge) => (
                  <span key={badge.label} className={`rounded-md px-2 py-1 text-[12px] font-semibold ${badge.kind === 'featured' ? 'bg-[#F6B84A] text-ink' : 'bg-white/15 text-white'}`}>{badge.label}</span>
                ))}
                {kindLabel && <span className="text-[13px] font-semibold text-white/75">{categoryLabelFr(kindLabel)}</span>}
              </div>
              <h1 className="mt-3 font-display text-[28px] font-bold leading-[1.05] tracking-[-0.03em] !text-white min-[1280px]:text-[38px] min-[1440px]:text-[44px]">{event.title}</h1>
              <p className="mt-4 flex items-center gap-2 text-[16px] !text-white"><CalendarBlank size={18} /> {when}</p>
              {clock && !event.is_permanent && (
                <p className="mt-2 flex items-start gap-2 text-[16px] !text-white">
                  <Clock size={18} className="mt-0.5" />
                  <span>{clock}<small className="mt-0.5 block text-[12.5px] text-white/65">Heure de Ouagadougou</small></span>
                </p>
              )}
              <p className="mt-2 flex items-center gap-2 text-[16px] !text-white"><MapPin size={18} /> {place.label}</p>
              <p className="mt-4 text-[18px] font-semibold !text-white">{heroPriceLine(event, mode)}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={shareWhatsApp} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white/10 px-3 text-[14px] font-semibold text-white"><WhatsappLogo size={16} /> Partager</button>
                {!event.is_permanent && (
                  <button type="button" onClick={addToCalendar} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white/10 px-3 text-[14px] font-semibold text-white"><CalendarBlank size={16} /> Ajouter au calendrier</button>
                )}
                <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white/10 px-3 text-[14px] font-semibold text-white"><Copy size={16} /> Copier le lien</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OpenInAppBanner />

      <div className="grid items-start gap-8 px-5 pt-6 min-[1280px]:grid-cols-[minmax(0,1fr)_380px] min-[1280px]:px-16 min-[1440px]:grid-cols-[minmax(0,1fr)_400px] min-[1440px]:px-20">
        <div className="order-2 min-w-0 space-y-10 min-[1280px]:order-1">
          {event.description && (
            <section>
              <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">À propos</h2>
              <p className={`mt-3 whitespace-pre-line text-[15.5px] leading-relaxed text-ink-2 ${aboutOpen ? '' : 'overflow-hidden'}`} style={aboutOpen ? undefined : { display: '-webkit-box', WebkitLineClamp: 9, WebkitBoxOrient: 'vertical' }}>{event.description}</p>
              <button type="button" onClick={() => setAboutOpen((open) => !open)} className="mt-2 text-[14px] font-semibold text-brand">{aboutOpen ? 'Réduire' : 'Lire la suite'}</button>
            </section>
          )}

          {artists.length > 0 && (
            <section>
              <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">À l’affiche</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {artists.map((artist) => (
                  <Link key={artist.id} to={`/artists/${artist.slug || artist.id}`} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2">
                    {artist.photo_url ? <img src={resizedImageUrl(artist.photo_url, 144) || artist.photo_url} onError={(e) => { if (e.currentTarget.src !== artist.photo_url) e.currentTarget.src = artist.photo_url; }} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 rounded-full object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-surf font-semibold">{artist.name?.charAt(0)}</span>}
                    <span>
                      <b className="block text-[15px]">{artist.name}</b>
                      <small className="text-[13px] text-ink-3">{[ARTIST_ROLE_FR[artist.role] || artist.role, artist.genre].filter(Boolean).join(' · ')}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {event.is_permanent ? (
            <section>
              <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">Horaires</h2>
              <p className="mt-2 text-[15px] text-ink-2">{hoursLine(eventDates)}</p>
              <p className="text-[13px] text-ink-3">Heures de Ouagadougou.</p>
            </section>
          ) : eventDates.length > 1 && mode !== 'open' && (
            <section>
              <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">{eventDates.length} dates</h2>
              <p className="mt-1 text-[13px] text-ink-3">Heures de Ouagadougou.</p>
              <div className="mt-3 divide-y divide-line border-y border-line">
                {eventDates.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-3 text-[15px]">
                    <span>{formatCalendarDate(row.date, { weekday: 'long', day: 'numeric', month: 'long' }, tz)}</span>
                    <span className="text-ink-3">{formatEventTime(row.start_time)}{row.end_time ? ` → ${formatEventTime(row.end_time)}` : ''}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">Lieu</h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-4">
              <p className="flex items-start gap-2"><MapPin size={18} className="mt-0.5 text-brand" /><span><b className="block">{place.venue}</b><span className="text-[14px] text-ink-3">{place.city}</span></span></p>
              <div className="flex gap-2">
                <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-[10px] border border-line px-3 text-[14px] font-semibold">Ouvrir dans Maps</a>
                {venue?.slug && <Link to={`/venues/${venue.slug}`} className="inline-flex h-10 items-center rounded-[10px] border border-line px-3 text-[14px] font-semibold">Voir le lieu</Link>}
              </div>
            </div>
          </section>

          {org?.business_name && (
            <section>
              <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">Organisateur</h2>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-surf font-display text-[18px] font-bold">{org.business_name.charAt(0)}</span>
                  <span><b className="block">{org.business_name}</b><span className="text-[14px] text-ink-3">Organisé par</span></span>
                </p>
                {org.slug && <Link to={`/organizers/${org.slug}`} className="text-[14px] font-semibold text-brand">Voir ses événements</Link>}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">Infos pratiques</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <p className="flex gap-3 text-[14.5px]"><DeviceMobile size={20} className="shrink-0 text-brand" /><span><b className="block">Billet sur votre téléphone</b>Un QR par billet, à présenter à l’entrée, même sans réseau.</span></p>
              <p className="flex gap-3 text-[14.5px]"><CreditCard size={20} className="shrink-0 text-brand" /><span><b className="block">Paiement en FCFA</b>Orange Money, Moov Money ou carte.</span></p>
              <p className="flex gap-3 text-[14.5px]"><SealCheck size={20} className="shrink-0 text-brand" /><span><b className="block">Prix officiel</b>Billets vendus par l’organisateur, au prix officiel.</span></p>
              <p className="flex gap-3 text-[14.5px]"><ChatCircle size={20} className="shrink-0 text-brand" /><span><b className="block">Une question ?</b>WhatsApp Temba 7j/7 · +226 74 75 08 15.</span></p>
            </div>
          </section>

          {related.length > 0 && (
            <section className="max-w-full min-w-0">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="font-display text-[20px] font-bold min-[1280px]:text-[24px]">{kind === 'concert' ? `Autres concerts à ${city}` : `Aussi à ${city}`}</h2>
                <Link to="/events" className="text-[14px] font-semibold text-brand">Tout voir</Link>
              </div>
              <div className="flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [touch-action:pan-x_pan-y] [&::-webkit-scrollbar]:hidden">
                {related.map((item, index) => (
                  <DisplayCard key={item.id} event={item} span={spanFor(item)} width={236} eager={index < 3} />
                ))}
              </div>
            </section>
          )}

        </div>

        <aside className="order-1 min-[1280px]:sticky min-[1280px]:top-24 min-[1280px]:order-2 min-[1280px]:-mt-64">
          <EventTicketPanel event={event} dates={eventDates} />
        </aside>
      </div>

      <section className="px-5 pb-16 pt-12 min-[1280px]:px-16 min-[1440px]:px-20">
        <AppBand />
      </section>
    </div>
  );
}
