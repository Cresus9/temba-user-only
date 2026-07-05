import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Ticket, Instagram, Facebook, Youtube,
  Globe, CheckCircle, ArrowLeft, ExternalLink, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency, parseLocalDate } from '../../utils/formatters';
import { countryFlag } from '../../utils/eventGeo';
import OptimizedImage from '../../components/common/Image';

interface OrganizerProfile {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  slug: string | null;
  city: string | null;
  country_code: string | null;
  social_links: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    whatsapp?: string;
    twitter?: string;
    website?: string;
  } | null;
  verified: boolean;
  followers_count: number;
  created_at: string;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string;
  image_url: string | null;
  price: number;
  currency: string;
  status: string;
  tickets_sold: number;
  capacity: number;
}

type Tab = 'upcoming' | 'past';

const display = '"Plus Jakarta Sans", Inter, sans-serif';

function EventTile({ event }: { event: EventCard }) {
  const [y, m, d] = event.date.split('T')[0].split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayNum = String(d).padStart(2, '0');
  const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
  const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
  const sold = event.tickets_sold ?? 0;
  const cap = event.capacity ?? 1;
  const pct = Math.min(100, Math.round((sold / cap) * 100));

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex gap-4 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 hover:shadow-card transition-all"
    >
      {/* Date badge */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream border border-line flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-bold text-brand uppercase tracking-wider leading-none">{month}</span>
        <span className="text-[22px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>{dayNum}</span>
      </div>

      {/* Cover */}
      {event.image_url && (
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-cream">
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-ink leading-snug truncate group-hover:text-brand transition-colors" style={{ fontFamily: display }}>
          {event.title}
        </p>
        <p className="text-[12px] text-ink-mute mt-0.5 truncate capitalize">{weekday}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin className="w-3 h-3 text-ink-mute flex-shrink-0" />
          <span className="text-[11px] text-ink-mute truncate">{event.location}</span>
        </div>
      </div>

      {/* Price + availability */}
      <div className="flex-shrink-0 flex flex-col items-end justify-between">
        <span className="text-[12px] font-bold text-brand">
          {event.price === 0 ? 'Gratuit' : formatCurrency(event.price, event.currency)}
        </span>
        <div className="w-16">
          <div className="h-1 bg-cream rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[9px] text-ink-mute mt-0.5 text-right">{sold}/{cap}</p>
        </div>
      </div>
    </Link>
  );
}

export default function OrganizerProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchOrganizer();
  }, [slug]);

  const fetchOrganizer = async () => {
    setLoading(true);
    try {
      // Try by slug first, fallback to id for backwards compat
      const { data: org, error } = await supabase
        .from('organizer_profiles')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !org) {
        setNotFound(true);
        return;
      }

      setOrganizer(org);

      // Fetch all events for this organizer
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, date, time, location, image_url, price, currency, status, tickets_sold, capacity')
        .eq('organizer_id', org.user_id)
        .eq('status', 'PUBLISHED')
        .order('date', { ascending: true });

      setEvents(eventsData || []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter(e => {
    const [y, m, d] = e.date.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d) >= now;
  });

  const pastEvents = events.filter(e => {
    const [y, m, d] = e.date.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d) < now;
  }).reverse();

  const shownEvents = tab === 'upcoming' ? upcomingEvents : pastEvents;

  const memberSince = organizer
    ? new Date(organizer.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : '';

  const socialLinks = organizer?.social_links ?? {};

  if (loading) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !organizer) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-paper border border-line grid place-items-center">
          <Users className="w-7 h-7 text-ink-mute" />
        </div>
        <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Organisateur introuvable</h1>
        <p className="text-[14px] text-ink-mute text-center">Ce profil n'existe pas ou a été supprimé.</p>
        <Link to="/events" className="mt-2 px-5 py-2.5 bg-brand text-paper rounded-xl text-[13px] font-bold hover:bg-brand/90 transition-colors">
          Voir les événements
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream bg-grain">

      {/* ── Hero / Cover ── */}
      <div className="relative h-52 sm:h-72 bg-ink overflow-hidden">
        {organizer.cover_image_url ? (
          <img
            src={organizer.cover_image_url}
            alt={`${organizer.business_name} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/30 via-ink to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />

        {/* Back button */}
        <Link
          to="/events"
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-ink/50 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-ink/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Événements
        </Link>
      </div>

      {/* ── Profile card ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-16 mb-6">
          <div className="bg-paper rounded-2xl border border-line shadow-pop p-5 sm:p-6">

            {/* Logo + name row */}
            <div className="flex items-end gap-4 -mt-16 mb-4">
              <div className="w-24 h-24 rounded-2xl border-4 border-paper bg-cream overflow-hidden shadow-pop flex-shrink-0">
                {organizer.logo_url ? (
                  <img src={organizer.logo_url} alt={organizer.business_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-brand/10">
                    <span className="text-[28px] font-extrabold text-brand" style={{ fontFamily: display }}>
                      {organizer.business_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="pb-1">
                {organizer.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/8 px-2 py-0.5 rounded-full mb-1">
                    <CheckCircle className="w-3 h-3" /> Vérifié
                  </span>
                )}
                <h1 className="text-[22px] sm:text-[26px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>
                  {organizer.business_name}
                </h1>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-mute mb-4">
              {(organizer.city || organizer.country_code) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {[organizer.city, organizer.country_code ? countryFlag(organizer.country_code) : null]
                    .filter(Boolean).join(' ')}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                Membre depuis {memberSince}
              </span>
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 flex-shrink-0" />
                {events.length} événement{events.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Bio */}
            {organizer.description && (
              <p className="text-[14px] text-ink/80 leading-relaxed mb-4">
                {organizer.description}
              </p>
            )}

            {/* Social links */}
            {(socialLinks.instagram || socialLinks.facebook || socialLinks.youtube || socialLinks.website) && (
              <div className="flex flex-wrap gap-2">
                {socialLinks.instagram && (
                  <a href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors">
                    <Instagram className="w-3.5 h-3.5" />
                    Instagram
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={`https://facebook.com/${socialLinks.facebook}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors">
                    <Facebook className="w-3.5 h-3.5" />
                    Facebook
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={`https://youtube.com/@${socialLinks.youtube.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors">
                    <Youtube className="w-3.5 h-3.5" />
                    YouTube
                  </a>
                )}
                {socialLinks.website && (
                  <a href={socialLinks.website.startsWith('http') ? socialLinks.website : `https://${socialLinks.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors">
                    <Globe className="w-3.5 h-3.5" />
                    Site web
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Événements', value: events.length },
            { label: 'À venir', value: upcomingEvents.length },
            { label: 'Passés', value: pastEvents.length },
          ].map(stat => (
            <div key={stat.label} className="bg-paper border border-line rounded-2xl p-4 text-center">
              <p className="text-[26px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>
                {stat.value}
              </p>
              <p className="text-[11px] text-ink-mute mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 bg-paper border border-line rounded-xl mb-4 w-fit">
          {(['upcoming', 'past'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                tab === t ? 'bg-brand text-paper shadow-sm' : 'text-ink-mute hover:text-ink'
              }`}
            >
              {t === 'upcoming' ? `À venir (${upcomingEvents.length})` : `Passés (${pastEvents.length})`}
            </button>
          ))}
        </div>

        {/* ── Event list ── */}
        <div className="pb-12">
          {shownEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-paper border border-line grid place-items-center">
                <Calendar className="w-6 h-6 text-ink-mute" />
              </div>
              <p className="text-[14px] font-bold text-ink">
                {tab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}
              </p>
              <p className="text-[12px] text-ink-mute">
                {tab === 'upcoming' ? 'Revenez bientôt pour voir les prochains événements.' : "Cet organisateur n'a pas encore d'événements passés."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shownEvents.map(event => (
                <EventTile key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
