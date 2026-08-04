import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Building2, Globe, Phone, ArrowLeft,
  CheckCircle, Users, Package, ChevronRight, Ticket,
  UtensilsCrossed, Zap, Waves, Car, ShoppingBag, Map, Camera,
} from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency } from '../../utils/formatters';
import { countryFlag } from '../../utils/eventGeo';
import {
  getServicesForVenue, groupByCategory, CATEGORY_ICONS,
  type VenueService,
} from '../../services/venueServiceService';

// ── Design tokens ─────────────────────────────────────────────────────────────
const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

// ── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, Zap, Waves, Car, ShoppingBag, Map, Camera, Package,
};
function SvcIcon({ name, className }: { name: string | null; className?: string }) {
  const Comp = ICON_MAP[name ?? ''] ?? Package;
  return <Comp className={className} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
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
}

interface EventCard {
  id: string;
  title: string;
  date: string | null;
  image_url: string | null;
  price: number;
  currency: string;
  is_permanent?: boolean;
}

type Tab = 'upcoming' | 'past';

export default function VenueProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [venue,    setVenue]    = useState<Venue | null>(null);
  const [events,   setEvents]   = useState<EventCard[]>([]);
  const [services, setServices] = useState<VenueService[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab,      setTab]      = useState<Tab>('upcoming');
  const [activePhoto, setActivePhoto] = useState(0);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: v } = await supabase
        .from('venues')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!v) { setNotFound(true); setLoading(false); return; }
      setVenue(v);

      const [evtsResult, svcsResult] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, date, image_url, price, currency, status, is_permanent')
          .eq('venue_id', v.id)
          .eq('status', 'PUBLISHED')
          .order('date'),
        getServicesForVenue(v.id),
      ]);

      setEvents(evtsResult.data || []);
      setServices(svcsResult);

      // Auto-expand first service category
      const groups = groupByCategory(svcsResult);
      if (groups.length) setExpandedCat(groups[0].slug);

      setLoading(false);
    })();
  }, [slug]);

  const now      = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = events.filter(e => {
    if (e.is_permanent) return true;
    if (!e.date) return false;
    const [y, m, d] = e.date.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d) >= now;
  });
  const past = events.filter(e => {
    if (e.is_permanent || !e.date) return false;
    const [y, m, d] = e.date.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d) < now;
  }).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  const photos: string[] = venue?.photos && Array.isArray(venue.photos) ? venue.photos : [];
  const serviceGroups = groupByCategory(services);

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-cream bg-grain flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !venue) return (
    <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
      <Building2 className="w-10 h-10 text-ink-mute" />
      <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Lieu introuvable</h1>
      <Link to="/venues" className="px-5 py-2.5 bg-brand text-paper rounded-xl text-[13px] font-bold">
        Voir tous les lieux
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream bg-grain">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative h-56 sm:h-80 bg-ink overflow-hidden">
        {photos.length > 0 ? (
          <img
            src={photos[activePhoto]}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/20 via-ink to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />

        <Link
          to="/venues"
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-ink/50 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-ink/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Lieux
        </Link>

        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activePhoto ? 'bg-paper scale-125' : 'bg-paper/50'}`}
              />
            ))}
          </div>
        )}

        {/* Venue name overlaid on hero */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5">
          <div className="flex items-end gap-3">
            {/* Avatar thumbnail */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-paper/50 bg-cream overflow-hidden flex-shrink-0 shadow-pop">
              {photos.length > 0
                ? <img src={photos[0]} alt={venue.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center bg-brand/10"><Building2 className="w-7 h-7 text-brand" /></div>}
            </div>
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-[22px] sm:text-[28px] font-extrabold text-paper leading-tight truncate"
                  style={{ fontFamily: display }}
                >
                  {venue.name}
                </h1>
                {venue.verified && (
                  <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />
                )}
              </div>
              {(venue.city || venue.country_code) && (
                <p className="text-[13px] text-paper/70 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {[venue.city, venue.country_code ? countryFlag(venue.country_code) : null]
                    .filter(Boolean).join(' ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Info bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-mute">
          {venue.capacity && (
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Capacité : {venue.capacity.toLocaleString('fr-FR')}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {events.length} événement{events.length !== 1 ? 's' : ''}
          </span>
          {services.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              {services.length} service{services.length !== 1 ? 's' : ''}
            </span>
          )}
          {venue.address && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {venue.address}
            </span>
          )}
        </div>

        {/* ── Description ──────────────────────────────────────────────── */}
        {venue.description && (
          <p className="text-[14px] text-ink/80 leading-relaxed">{venue.description}</p>
        )}

        {/* ── Contact links ────────────────────────────────────────────── */}
        {(venue.website || venue.phone) && (
          <div className="flex flex-wrap gap-2">
            {venue.website && (
              <a
                href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"
              >
                <Globe className="w-3.5 h-3.5" /> Site web
              </a>
            )}
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> {venue.phone}
              </a>
            )}
          </div>
        )}

        {/* ── Services section ─────────────────────────────────────────── */}
        {serviceGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="eyebrow !mb-0.5">Sur place</p>
                <h2 className="text-[17px] font-bold text-ink" style={{ fontFamily: display }}>
                  Services disponibles
                </h2>
              </div>
              <span
                className="text-[11px] text-ink-mute tabular-nums"
                style={{ fontFamily: mono }}
              >
                {services.length} option{services.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Category pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {serviceGroups.map(g => (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => setExpandedCat(prev => prev === g.slug ? null : g.slug)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                    expandedCat === g.slug
                      ? 'border-brand/40 bg-brand/8 shadow-sm'
                      : 'border-line bg-paper hover:border-brand/30'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${
                    expandedCat === g.slug ? 'bg-brand/15' : 'bg-cream'
                  }`}>
                    <SvcIcon
                      name={CATEGORY_ICONS[g.slug] ?? null}
                      className={`w-3.5 h-3.5 ${expandedCat === g.slug ? 'text-brand' : 'text-ink-mute'}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-bold truncate ${expandedCat === g.slug ? 'text-brand' : 'text-ink'}`}>
                      {g.label}
                    </p>
                    <p className="text-[10px] text-ink-mute">
                      {g.services.length} option{g.services.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Expanded category detail */}
            {expandedCat && (() => {
              const group = serviceGroups.find(g => g.slug === expandedCat);
              if (!group) return null;
              return (
                <div className="rounded-xl border border-brand/20 bg-paper overflow-hidden divide-y divide-line">
                  {group.services.map(svc => (
                    <div key={svc.id} className="flex items-center gap-3 px-4 py-3.5">
                      {svc.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-line flex-shrink-0">
                          <img
                            src={svc.image_url}
                            alt={svc.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-cream border border-line grid place-items-center flex-shrink-0">
                          <SvcIcon name={CATEGORY_ICONS[expandedCat] ?? null} className="w-5 h-5 text-ink-mute" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-ink">{svc.name}</p>
                        {svc.description && (
                          <p className="text-[11px] text-ink-mute mt-0.5 leading-snug">{svc.description}</p>
                        )}
                        {svc.max_per_order && (
                          <p className="text-[10px] text-ink-mute mt-0.5">Max {svc.max_per_order} / commande</p>
                        )}
                      </div>
                      <span
                        className="text-[14px] font-extrabold text-brand tabular-nums flex-shrink-0"
                        style={{ fontFamily: display }}
                      >
                        {svc.price === 0 ? (
                          <span className="text-emerald-600">Inclus</span>
                        ) : (
                          formatCurrency(svc.price, 'XOF')
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <p className="text-[11px] text-ink-mute mt-2.5 text-center">
              Ces services peuvent être ajoutés lors de votre réservation
            </p>
          </div>
        )}

        {/* ── Events tabs ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="eyebrow !mb-0.5">Programme</p>
              <h2 className="text-[17px] font-bold text-ink" style={{ fontFamily: display }}>
                Événements
              </h2>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-paper border border-line rounded-xl mb-4 w-fit">
            {(['upcoming', 'past'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  tab === t ? 'bg-brand text-paper shadow-sm' : 'text-ink-mute hover:text-ink'
                }`}
              >
                {t === 'upcoming'
                  ? `À venir (${upcoming.length})`
                  : `Passés (${past.length})`}
              </button>
            ))}
          </div>

          {/* Event cards */}
          <div className="pb-12 space-y-3">
            {shown.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <Calendar className="w-8 h-8 text-ink-mute" />
                <p className="text-[14px] font-bold text-ink">
                  {tab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}
                </p>
              </div>
            ) : (
              shown.map(event => {
                const isPerm = event.is_permanent;
                const dateParts = event.date ? event.date.split('T')[0].split('-').map(Number) : null;
                const dt = dateParts ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]) : null;

                return (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="group flex gap-4 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 hover:shadow-card transition-all"
                  >
                    {/* Date badge or "Ouvert" */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream border border-line flex flex-col items-center justify-center">
                      {isPerm ? (
                        <>
                          <Ticket className="w-4 h-4 text-brand mb-0.5" />
                          <span className="text-[9px] font-bold text-brand uppercase tracking-wide">Ouvert</span>
                        </>
                      ) : dt ? (
                        <>
                          <span className="text-[10px] font-bold text-brand uppercase">
                            {dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                          </span>
                          <span className="text-[22px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>
                            {String(dt.getDate()).padStart(2, '0')}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {event.image_url && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden">
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-bold text-ink truncate group-hover:text-brand transition-colors"
                        style={{ fontFamily: display }}
                      >
                        {event.title}
                      </p>
                      {dt && (
                        <p className="text-[11px] text-ink-mute mt-0.5">
                          {dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                        </p>
                      )}
                      {isPerm && (
                        <p className="text-[11px] text-ink-mute mt-0.5">Attraction permanente</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                      <span className="text-[12px] font-bold text-brand">
                        {event.price === 0 ? 'Gratuit' : formatCurrency(event.price, event.currency)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-mute group-hover:text-brand transition-colors" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
