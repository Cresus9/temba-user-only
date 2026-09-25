import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Building2, Globe, Phone, ArrowLeft, ArrowRight,
  CheckCircle, Users, Package, Ticket, Share2,
  UtensilsCrossed, Zap, Waves, Car, ShoppingBag, Map, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency, parseLocalDate, localTodayYmd } from '../../utils/formatters';
import { countryFlag } from '../../utils/eventGeo';
import { eventPublicPath } from '../../utils/eventPath';
import PageSEO from '../../components/SEO/PageSEO';
import { FadeUp, Stagger, StaggerItem } from '../../components/common/Motion';
import { ArtistStage } from '../../components/ui/artist-stage';
import VenuesMap from '../../components/venue/VenuesMap';
import {
  getServicesForVenue, groupByCategory, CATEGORY_ICONS,
  type VenueService,
} from '../../services/venueServiceService';
import {
  venueCanonicalUrl,
  venueFaqItems,
  venueMetaDescription,
  venueSeoTitle,
  venueStructuredData,
} from '../../utils/venueSeo';

const display = '"Plus Jakarta Sans", Inter, sans-serif';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, Zap, Waves, Car, ShoppingBag, Map, Camera, Package,
};
function SvcIcon({ name, className }: { name: string | null; className?: string }) {
  const Comp = ICON_MAP[name ?? ''] ?? Package;
  return <Comp className={className} />;
}

interface Venue {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  country_code: string | null;
  capacity: number | null;
  photos: string[] | null;
  website: string | null;
  phone: string | null;
  verified: boolean;
  event_count: number;
  lat?: number | string | null;
  lng?: number | string | null;
}

interface EventCard {
  id: string;
  title: string;
  date: string | null;
  image_url: string | null;
  price: number;
  currency: string;
  is_permanent?: boolean;
  slug?: string | null;
}

interface PeerVenue {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  photos: string[] | null;
  verified: boolean;
}

type Tab = 'upcoming' | 'past';

function mapsHref(address?: string | null, city?: string | null) {
  const q = [address, city].filter(Boolean).join(', ');
  if (!q) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function eventDay(date: string | null) {
  if (!date) return '';
  return date.split('T')[0];
}

export default function VenueProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [services, setServices] = useState<VenueService[]>([]);
  const [peers, setPeers] = useState<PeerVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [activePhoto, setActivePhoto] = useState(0);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: v } = await supabase
        .from('venues')
        .select('id, name, slug, description, address, city, country_code, capacity, photos, website, phone, verified, event_count, lat, lng')
        .eq('slug', slug)
        .maybeSingle();

      if (cancelled) return;
      if (!v) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setVenue(v);

      const [evtsResult, svcsResult, peersResult] = await Promise.all([
        supabase
          .from('events')
          .select('id, slug, title, date, image_url, price, currency, status, is_permanent')
          .eq('venue_id', v.id)
          .eq('status', 'PUBLISHED')
          .order('date'),
        getServicesForVenue(v.id),
        v.city
          ? supabase
              .from('venues')
              .select('id, name, slug, city, photos, verified')
              .eq('city', v.city)
              .neq('id', v.id)
              .not('slug', 'is', null)
              .order('name')
              .limit(8)
          : Promise.resolve({ data: [] as PeerVenue[] }),
      ]);

      if (cancelled) return;

      setEvents(evtsResult.data || []);
      setServices(svcsResult);
      setPeers((peersResult.data || []).filter((p: PeerVenue) => p.slug));

      const groups = groupByCategory(svcsResult);
      if (groups.length) setExpandedCat(groups[0].slug);
      setActivePhoto(0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const today = localTodayYmd();
  const upcoming = events.filter((e) => {
    if (e.is_permanent) return true;
    const day = eventDay(e.date);
    return day ? day >= today : false;
  });
  const past = events
    .filter((e) => {
      if (e.is_permanent) return false;
      const day = eventDay(e.date);
      return day ? day < today : false;
    })
    .reverse();
  const shown = tab === 'upcoming' ? upcoming : past;
  const nextShow = upcoming[0] || null;

  const photos: string[] = venue?.photos && Array.isArray(venue.photos) ? venue.photos.filter(Boolean) : [];
  const serviceGroups = groupByCategory(services);
  const heroPhoto = photos[activePhoto] || photos[0] || '';

  const pageUrl = venue?.slug ? venueCanonicalUrl(venue.slug) : '';
  const place = venue
    ? [venue.city, venue.country_code ? countryFlag(venue.country_code) : null].filter(Boolean).join(' ')
    : '';
  const directions = venue ? mapsHref(venue.address, venue.city) : '';

  const structuredData = useMemo(() => {
    if (!venue?.slug) return undefined;
    return venueStructuredData({
      name: venue.name,
      slug: venue.slug,
      description: venue.description,
      city: venue.city,
      address: venue.address,
      image: photos[0],
      nextShow,
      serviceCount: services.length,
    });
  }, [venue, photos, nextShow, services.length]);

  const share = async () => {
    if (!venue) return;
    const text = `${venue.name} — événements et billets sur Temba`;
    try {
      if (navigator.share) {
        await navigator.share({ title: venue.name, text, url: pageUrl });
        return;
      }
    } catch {
      /* cancelled */
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
        <Building2 className="w-10 h-10 text-ink-mute" />
        <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Lieu introuvable</h1>
        <Link to="/venues" className="px-5 py-2.5 bg-accent text-ink rounded-xl text-[13px] font-bold">
          Voir tous les lieux
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageSEO
        title={venueSeoTitle(venue.name, venue.city)}
        description={venueMetaDescription({
          name: venue.name,
          city: venue.city,
          description: venue.description,
          nextShow,
        })}
        canonicalUrl={pageUrl}
        ogType="place"
        ogImage={photos[0]}
        keywords={[
          venue.name,
          venue.city,
          `événements ${venue.name}`,
          `billets ${venue.city || ''}`.trim(),
          'salle concert Burkina',
          'Temba',
        ].filter(Boolean) as string[]}
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-cream bg-grain">
        <ArtistStage className="min-h-[240px] md:min-h-[300px]" watermark={venue.name}>
          <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-3 pb-5 md:pt-4 md:pb-7">
            <Link
              to="/venues"
              className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 bg-paper/12 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-paper/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Lieux
            </Link>
            <p className="mt-3 text-[11px] text-white/40">
              <Link to="/" className="hover:text-white/70">Accueil</Link>
              {' · '}
              <Link to="/venues" className="hover:text-white/70">Lieux</Link>
              {' · '}
              <span className="text-white/70">{venue.name}</span>
            </p>

            <div className="mt-4 md:mt-6 relative z-10 max-w-3xl">
              <div className="min-w-0 flex flex-row items-stretch gap-4 sm:gap-6">
                <div className="relative w-fit flex-shrink-0">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1 top-1 h-full w-full rounded-xl2 border border-accent/45"
                  />
                  <div className="relative size-40 sm:size-44 md:size-48 rounded-xl2 overflow-hidden border border-paper/15 bg-ink">
                    {heroPhoto ? (
                      <img src={heroPhoto} alt={`${venue.name}, lieu`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center bg-accent/20">
                        <Building2 className="w-10 h-10 text-paper/70" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <p className="eyebrow !text-white/45 mb-1.5 tracking-[0.18em] !text-[10px] sm:!text-[11px]">
                      Lieu{venue.verified ? ' · Vérifié' : ''}
                    </p>
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <h1
                        className="text-[clamp(22px,4vw,40px)] font-semibold text-white leading-[1.05] tracking-[-0.045em] antialiased"
                        style={{ fontFamily: display, fontWeight: 600 }}
                      >
                        {venue.name}
                      </h1>
                      {venue.verified && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 flex-shrink-0 mt-1.5" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] sm:text-[13px] text-white/50">
                      {place && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                          {place}
                        </span>
                      )}
                      {venue.capacity ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-accent" />
                          {venue.capacity.toLocaleString('fr-FR')} places
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-accent" />
                        {upcoming.length > 0
                          ? `${upcoming.length} à venir`
                          : 'Pas encore de date Temba'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                    <a
                      href="#dates"
                      className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-accent text-ink text-[12px] sm:text-[13px] font-bold hover:bg-accent/90 transition-colors"
                    >
                      Voir l’agenda
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </a>
                    {directions ? (
                      <a
                        href={directions}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-paper/12 text-paper text-[12px] sm:text-[13px] font-semibold hover:bg-paper/20 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Itinéraire
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={share}
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-paper/12 text-paper text-[12px] sm:text-[13px] font-semibold hover:bg-paper/20 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Partager
                      </button>
                    )}
                    {directions ? (
                      <button
                        type="button"
                        onClick={share}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-paper/20 text-paper text-[13px] font-semibold hover:bg-paper/10 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Partager
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ArtistStage>

        <div className="bg-cream bg-grain">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
              <div className="lg:col-span-8 space-y-14">
                <FadeUp>
                  <section>
                    <p className="eyebrow mb-4 tracking-[0.18em]">À propos</p>
                    {venue.description ? (
                      <p
                        className="text-[18px] sm:text-[20px] text-ink leading-[1.5] tracking-[-0.02em] max-w-[38rem]"
                        style={{ fontFamily: display }}
                      >
                        {venue.description}
                      </p>
                    ) : (
                      <p className="text-[15px] text-ink-mute max-w-lg leading-relaxed">
                        Fiche officielle de {venue.name} sur Temba. Les dates publiées par les organisateurs et les billets en FCFA apparaissent ici.
                      </p>
                    )}
                    {venue.address && (
                      <p className="mt-4 text-[13px] text-ink-mute max-w-lg leading-relaxed inline-flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-accent flex-shrink-0" />
                        {venue.address}
                        {venue.city ? ` · ${venue.city}` : ''}
                      </p>
                    )}
                    {(venue.website || venue.phone) && (
                      <div className="flex flex-wrap gap-2 mt-6">
                        {venue.website && (
                          <a
                            href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-paper text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-ink/80 transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Site web
                          </a>
                        )}
                        {venue.phone && (
                          <a
                            href={`tel:${venue.phone}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-paper text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-ink/80 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {venue.phone}
                          </a>
                        )}
                      </div>
                    )}
                    {photos.length > 1 && (
                      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
                        {photos.map((src, i) => (
                          <button
                            key={src + i}
                            type="button"
                            onClick={() => setActivePhoto(i)}
                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border transition-colors ${
                              i === activePhoto ? 'border-ink' : 'border-line hover:border-ink/40'
                            }`}
                          >
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </FadeUp>

                {serviceGroups.length > 0 && (
                  <FadeUp delay={0.04}>
                    <section>
                      <p className="eyebrow mb-2 tracking-[0.18em]">Sur place</p>
                      <h2
                        className="text-[28px] sm:text-[32px] font-semibold text-ink tracking-[-0.04em] leading-none mb-5"
                        style={{ fontFamily: display }}
                      >
                        Services
                      </h2>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {serviceGroups.map((g) => (
                          <button
                            key={g.slug}
                            type="button"
                            onClick={() => setExpandedCat((prev) => (prev === g.slug ? null : g.slug))}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                              expandedCat === g.slug
                                ? 'border-ink bg-ink text-paper'
                                : 'border-line bg-transparent text-ink hover:border-ink/40'
                            }`}
                          >
                            <SvcIcon
                              name={CATEGORY_ICONS[g.slug] ?? null}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-[12px] font-semibold">{g.label}</span>
                            <span className="text-[11px] opacity-60 tabular-nums">{g.services.length}</span>
                          </button>
                        ))}
                      </div>
                      {expandedCat && (() => {
                        const group = serviceGroups.find((g) => g.slug === expandedCat);
                        if (!group) return null;
                        return (
                          <div className="divide-y divide-line border-y border-line">
                            {group.services.map((svc) => (
                              <div key={svc.id} className="flex items-center gap-3 py-4">
                                {svc.image_url ? (
                                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-paper">
                                    <img src={svc.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-paper grid place-items-center flex-shrink-0">
                                    <SvcIcon name={CATEGORY_ICONS[expandedCat] ?? null} className="w-5 h-5 text-ink-mute" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-semibold text-ink tracking-tight" style={{ fontFamily: display }}>
                                    {svc.name}
                                  </p>
                                  {svc.description && (
                                    <p className="text-[12px] text-ink-mute mt-0.5 leading-snug">{svc.description}</p>
                                  )}
                                </div>
                                <span className="text-[13px] font-semibold text-accent tabular-nums flex-shrink-0">
                                  {svc.price === 0 ? 'Inclus' : formatCurrency(svc.price, 'XOF')}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <p className="text-[12px] text-ink-mute mt-3">
                        Ces extras s’ajoutent au moment de la réservation.
                      </p>
                    </section>
                  </FadeUp>
                )}

                <FadeUp delay={0.06}>
                  <section id="dates">
                    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                      <div>
                        <p className="eyebrow mb-2 tracking-[0.18em]">Sur Temba</p>
                        <h2
                          className="text-[28px] sm:text-[32px] font-semibold text-ink tracking-[-0.04em] leading-none"
                          style={{ fontFamily: display }}
                        >
                          Événements à {venue.name}
                        </h2>
                      </div>
                      {events.length > 0 && (
                        <div className="flex gap-5">
                          {(['upcoming', 'past'] as Tab[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTab(t)}
                              className={`pb-1 text-[12px] font-semibold uppercase tracking-[0.14em] border-b transition-colors ${
                                tab === t
                                  ? 'text-ink border-accent'
                                  : 'text-ink-mute border-transparent hover:text-ink'
                              }`}
                            >
                              {t === 'upcoming' ? `À venir ${upcoming.length}` : `Passés ${past.length}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {events.length === 0 ? (
                      <div className="py-7 border-y border-line">
                        <p
                          className="text-[20px] font-semibold text-ink tracking-tight mb-2"
                          style={{ fontFamily: display }}
                        >
                          Pas encore de date sur Temba
                        </p>
                        <p className="text-[14px] text-ink-mute leading-relaxed max-w-lg mb-6">
                          Dès qu’un organisateur programme {venue.name}, les billets s’achètent ici — Orange Money, Moov, carte.
                        </p>
                        <Link
                          to="/events"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-ink text-[13px] font-bold hover:bg-accent/90"
                        >
                          Explorer l’agenda
                        </Link>
                      </div>
                    ) : shown.length === 0 ? (
                      <div className="py-10 border-y border-line text-center">
                        <Calendar className="w-6 h-6 text-ink-mute mx-auto mb-3" />
                        <p className="text-[14px] font-medium text-ink-mute">
                          {tab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}
                        </p>
                      </div>
                    ) : (
                      <div className="border-t border-line">
                        {shown.map((event) => {
                          const day = eventDay(event.date);
                          const dt = day ? parseLocalDate(day) : null;
                          const d = dt ? dt.getDate() : 0;
                          return (
                            <Link
                              key={event.id}
                              to={eventPublicPath(event)}
                              className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[4.5rem_1fr_auto] gap-4 sm:gap-6 items-center py-5 border-b border-line hover:bg-paper/70 transition-colors -mx-2 px-2 sm:mx-0 sm:px-1"
                            >
                              <div className="flex flex-col items-start sm:items-center min-w-[3.25rem]">
                                {event.is_permanent ? (
                                  <>
                                    <Ticket className="w-4 h-4 text-accent mb-0.5" />
                                    <span className="text-[10px] font-semibold text-ink-mute uppercase tracking-[0.16em]">
                                      Ouvert
                                    </span>
                                  </>
                                ) : dt ? (
                                  <>
                                    <span className="text-[10px] font-semibold text-ink-mute uppercase tracking-[0.16em]">
                                      {dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span
                                      className="text-[28px] font-semibold text-ink tabular-nums leading-none tracking-tight"
                                      style={{ fontFamily: display }}
                                    >
                                      {String(d).padStart(2, '0')}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <div className="min-w-0 flex items-center gap-4">
                                {event.image_url ? (
                                  <div className="hidden sm:block flex-shrink-0 w-14 h-14 overflow-hidden rounded-lg bg-paper">
                                    <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ) : null}
                                <div className="min-w-0">
                                  <p
                                    className="text-[16px] font-semibold text-ink truncate tracking-tight"
                                    style={{ fontFamily: display }}
                                  >
                                    {event.title}
                                  </p>
                                  <p className="mt-1 text-[12px] text-ink-mute truncate">
                                    {event.is_permanent ? 'Attraction permanente' : venue.city || 'Temba'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[13px] font-semibold text-accent tabular-nums flex-shrink-0">
                                {event.price === 0 ? 'Gratuit' : formatCurrency(event.price, event.currency)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </FadeUp>
              </div>

              <aside className="lg:col-span-4 space-y-10 lg:sticky lg:top-24 self-start lg:border-l lg:border-line lg:pl-10">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p
                      className="text-[40px] font-semibold text-ink tabular-nums leading-none tracking-tight"
                      style={{ fontFamily: display }}
                    >
                      {upcoming.length}
                    </p>
                    <p className="text-[11px] text-ink-mute mt-2 uppercase tracking-[0.16em]">À venir</p>
                  </div>
                  <div>
                    <p
                      className="text-[40px] font-semibold text-ink tabular-nums leading-none tracking-tight"
                      style={{ fontFamily: display }}
                    >
                      {past.length}
                    </p>
                    <p className="text-[11px] text-ink-mute mt-2 uppercase tracking-[0.16em]">Passés</p>
                  </div>
                </div>

                <VenuesMap
                  venues={[venue]}
                  selectedId={venue.id}
                  showPreview={false}
                  className="h-[220px]"
                />

                {nextShow && (
                  <Link to={eventPublicPath(nextShow)} className="block group">
                    <p className="eyebrow mb-3 tracking-[0.18em]">Prochain</p>
                    <div className="relative overflow-hidden rounded-xl2 bg-ink aspect-[4/5] max-h-[320px]">
                      {nextShow.image_url ? (
                        <img
                          src={nextShow.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-ink" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
                        <p className="text-[15px] font-semibold text-white leading-snug tracking-tight" style={{ fontFamily: display }}>
                          {nextShow.title}
                        </p>
                        <p className="text-[12px] text-white/60 mt-1 capitalize">
                          {nextShow.is_permanent
                            ? 'Attraction permanente'
                            : nextShow.date
                              ? parseLocalDate(eventDay(nextShow.date)).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                })
                              : ''}
                        </p>
                        <p className="text-[13px] font-semibold text-accent mt-2 tabular-nums">
                          {nextShow.price === 0 ? 'Gratuit' : formatCurrency(nextShow.price, nextShow.currency)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}

                {peers.length > 0 && (
                  <div>
                    <p className="eyebrow mb-4 tracking-[0.18em]">À proximité</p>
                    <Stagger className="divide-y divide-line border-t border-line">
                      {peers.map((p) => {
                        const thumb = Array.isArray(p.photos) && p.photos[0] ? p.photos[0] : '';
                        return (
                          <StaggerItem key={p.id}>
                            <Link
                              to={`/venues/${p.slug}`}
                              className="flex items-center gap-3 py-3 group -mx-1 px-1 hover:bg-paper/80 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-paper flex-shrink-0">
                                {thumb ? (
                                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full grid place-items-center text-[13px] font-semibold text-ink">
                                    {p.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-ink truncate tracking-tight" style={{ fontFamily: display }}>
                                  {p.name}
                                </p>
                                <p className="text-[11px] text-ink-mute truncate">{p.city || 'Lieu'}</p>
                              </div>
                              {p.verified && <CheckCircle className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />}
                            </Link>
                          </StaggerItem>
                        );
                      })}
                    </Stagger>
                  </div>
                )}
              </aside>
            </div>

            <FadeUp delay={0.08}>
              <section aria-labelledby="venue-faq" className="mt-14 md:mt-16 pt-10 border-t border-line">
                <p className="eyebrow mb-3 tracking-[0.18em]">Billets</p>
                <h2
                  id="venue-faq"
                  className="text-[22px] sm:text-[28px] font-semibold text-ink tracking-[-0.04em] leading-none mb-6"
                  style={{ fontFamily: display }}
                >
                  {venue.name} : questions fréquentes
                </h2>
                <div className="divide-y divide-line border-y border-line">
                  {venueFaqItems({
                    name: venue.name,
                    city: venue.city,
                    address: venue.address,
                    nextShow,
                    serviceCount: services.length,
                  }).map((item) => (
                    <details key={item.q} className="group py-4">
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                        <span>{item.q}</span>
                        <span className="text-ink-mute text-[18px] leading-none mt-0.5 group-open:hidden" aria-hidden>+</span>
                        <span className="text-ink-mute text-[18px] leading-none mt-0.5 hidden group-open:inline" aria-hidden>−</span>
                      </summary>
                      <p className="mt-2.5 text-[14px] text-ink-mute leading-relaxed max-w-2xl">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            </FadeUp>
          </div>
        </div>
      </div>
    </>
  );
}
