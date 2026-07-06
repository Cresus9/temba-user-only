import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Building2, Globe, Phone, ArrowLeft, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency } from '../../utils/formatters';
import { countryFlag } from '../../utils/eventGeo';

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
  lat: number | null;
  lng: number | null;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
  image_url: string | null;
  price: number;
  currency: string;
}

type Tab = 'upcoming' | 'past';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

export default function VenueProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: v } = await supabase.from('venues').select('*').eq('slug', slug).maybeSingle();
      if (!v) { setNotFound(true); setLoading(false); return; }
      setVenue(v);

      const { data: evts } = await supabase
        .from('events')
        .select('id, title, date, image_url, price, currency, status')
        .eq('venue_id', v.id)
        .eq('status', 'PUBLISHED')
        .order('date');
      setEvents(evts || []);
      setLoading(false);
    })();
  }, [slug]);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = events.filter(e => { const [y,m,d] = e.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d) >= now; });
  const past = events.filter(e => { const [y,m,d] = e.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d) < now; }).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  const photos: string[] = venue?.photos && Array.isArray(venue.photos) ? venue.photos : [];

  if (loading) return <div className="min-h-screen bg-cream bg-grain flex items-center justify-center"><div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (notFound || !venue) return (
    <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
      <Building2 className="w-10 h-10 text-ink-mute" />
      <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Lieu introuvable</h1>
      <Link to="/venues" className="px-5 py-2.5 bg-brand text-paper rounded-xl text-[13px] font-bold">Voir tous les lieux</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream bg-grain">
      {/* Cover / photo gallery */}
      <div className="relative h-52 sm:h-72 bg-ink overflow-hidden">
        {photos.length > 0
          ? <img src={photos[activePhoto]} alt={venue.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-brand/20 via-ink to-accent/20" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <Link to="/venues" className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-ink/50 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-ink/70 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Lieux
        </Link>
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setActivePhoto(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activePhoto ? 'bg-paper scale-125' : 'bg-paper/50'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-16 mb-6">
          <div className="bg-paper rounded-2xl border border-line shadow-pop p-5 sm:p-6">
            <div className="flex items-end gap-4 -mt-16 mb-4">
              <div className="w-20 h-20 rounded-2xl border-4 border-paper bg-cream overflow-hidden shadow-pop flex-shrink-0">
                {photos.length > 0
                  ? <img src={photos[0]} alt={venue.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center bg-brand/10"><Building2 className="w-8 h-8 text-brand" /></div>}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] sm:text-[26px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>{venue.name}</h1>
                  {venue.verified && <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-mute mb-3">
              {(venue.city || venue.country_code) && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[venue.city, venue.country_code ? countryFlag(venue.country_code) : null].filter(Boolean).join(' ')}</span>
              )}
              {venue.capacity && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Capacité : {venue.capacity.toLocaleString('fr-FR')}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{events.length} événement{events.length !== 1 ? 's' : ''}</span>
            </div>

            {venue.address && <p className="text-[12px] text-ink-mute flex items-center gap-1.5 mb-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{venue.address}</p>}
            {venue.description && <p className="text-[14px] text-ink/80 leading-relaxed mb-4">{venue.description}</p>}

            <div className="flex flex-wrap gap-2">
              {venue.website && <a href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Globe className="w-3.5 h-3.5" />Site web</a>}
              {venue.phone && <a href={`tel:${venue.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Phone className="w-3.5 h-3.5" />{venue.phone}</a>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-paper border border-line rounded-xl mb-4 w-fit">
          {(['upcoming','past'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${tab === t ? 'bg-brand text-paper shadow-sm' : 'text-ink-mute hover:text-ink'}`}>
              {t === 'upcoming' ? `À venir (${upcoming.length})` : `Passés (${past.length})`}
            </button>
          ))}
        </div>

        {/* Events */}
        <div className="pb-12 space-y-3">
          {shown.length === 0
            ? <div className="flex flex-col items-center py-16 gap-3"><Calendar className="w-8 h-8 text-ink-mute" /><p className="text-[14px] font-bold text-ink">{tab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}</p></div>
            : shown.map(event => {
              const [y,m,d] = event.date.split('T')[0].split('-').map(Number);
              const dt = new Date(y,m-1,d);
              return (
                <Link key={event.id} to={`/events/${event.id}`} className="group flex gap-4 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 hover:shadow-card transition-all">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream border border-line flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-brand uppercase">{dt.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')}</span>
                    <span className="text-[22px] font-extrabold text-ink leading-tight" style={{fontFamily:display}}>{String(d).padStart(2,'0')}</span>
                  </div>
                  {event.image_url && <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden"><img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-ink truncate group-hover:text-brand transition-colors" style={{fontFamily:display}}>{event.title}</p>
                    <p className="text-[11px] text-ink-mute mt-0.5">{dt.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long'})}</p>
                  </div>
                  <span className="text-[12px] font-bold text-brand flex-shrink-0">{event.price === 0 ? 'Gratuit' : formatCurrency(event.price, event.currency)}</span>
                </Link>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}
