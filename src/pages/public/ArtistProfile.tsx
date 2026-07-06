import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Music, Instagram, Facebook, Youtube, Twitter, Globe, CheckCircle, ArrowLeft, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency } from '../../utils/formatters';
import { countryFlag } from '../../utils/eventGeo';

interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  genre: string | null;
  photo_url: string | null;
  cover_image_url: string | null;
  country_code: string | null;
  city: string | null;
  social_links: { instagram?: string; facebook?: string; youtube?: string; twitter?: string; website?: string } | null;
  verified: boolean;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
  location: string;
  image_url: string | null;
  price: number;
  currency: string;
  role?: string;
}

type Tab = 'upcoming' | 'past';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

export default function ArtistProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: a } = await supabase.from('artists').select('*').eq('slug', slug).single();
      if (!a) { setNotFound(true); setLoading(false); return; }
      setArtist(a);

      const { data: ea } = await supabase
        .from('event_artists')
        .select('role, events(id, title, date, location, image_url, price, currency, status)')
        .eq('artist_id', a.id)
        .order('display_order');

      const evts: EventCard[] = (ea || [])
        .filter((row: any) => row.events?.status === 'PUBLISHED')
        .map((row: any) => ({ ...row.events, role: row.role }));
      setEvents(evts);
      setLoading(false);
    })();
  }, [slug]);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = events.filter(e => { const [y,m,d] = e.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d) >= now; });
  const past = events.filter(e => { const [y,m,d] = e.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d) < now; }).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  if (loading) return <div className="min-h-screen bg-cream bg-grain flex items-center justify-center"><div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (notFound || !artist) return (
    <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
      <Users className="w-10 h-10 text-ink-mute" />
      <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Artiste introuvable</h1>
      <Link to="/artists" className="px-5 py-2.5 bg-brand text-paper rounded-xl text-[13px] font-bold">Voir tous les artistes</Link>
    </div>
  );

  const social = artist.social_links ?? {};

  return (
    <div className="min-h-screen bg-cream bg-grain">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 bg-ink overflow-hidden">
        {artist.cover_image_url
          ? <img src={artist.cover_image_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-accent/30 via-ink to-brand/20" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <Link to="/artists" className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-ink/50 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-ink/70 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Artistes
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Profile card */}
        <div className="relative -mt-16 mb-6">
          <div className="bg-paper rounded-2xl border border-line shadow-pop p-5 sm:p-6">
            <div className="flex items-end gap-4 -mt-16 mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-paper bg-cream overflow-hidden shadow-pop flex-shrink-0">
                {artist.photo_url
                  ? <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center bg-accent/10"><span className="text-[28px] font-extrabold text-accent">{artist.name.charAt(0)}</span></div>}
              </div>
              <div className="pb-1">
                {artist.genre && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/8 px-2 py-0.5 rounded-full mb-1"><Music className="w-3 h-3" />{artist.genre}</span>}
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] sm:text-[26px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>{artist.name}</h1>
                  {artist.verified && <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-mute mb-3">
              {(artist.city || artist.country_code) && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{[artist.city, artist.country_code ? countryFlag(artist.country_code) : null].filter(Boolean).join(' ')}</span>
              )}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{events.length} concert{events.length !== 1 ? 's' : ''}</span>
            </div>

            {artist.bio && <p className="text-[14px] text-ink/80 leading-relaxed mb-4">{artist.bio}</p>}

            {(social.instagram || social.facebook || social.youtube || social.twitter || social.website) && (
              <div className="flex flex-wrap gap-2">
                {social.instagram && <a href={`https://instagram.com/${social.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Instagram className="w-3.5 h-3.5" />Instagram</a>}
                {social.facebook && <a href={`https://facebook.com/${social.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Facebook className="w-3.5 h-3.5" />Facebook</a>}
                {social.twitter && <a href={`https://twitter.com/${social.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Twitter className="w-3.5 h-3.5" />Twitter</a>}
                {social.youtube && <a href={`https://youtube.com/@${social.youtube.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Youtube className="w-3.5 h-3.5" />YouTube</a>}
                {social.website && <a href={social.website.startsWith('http') ? social.website : `https://${social.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"><Globe className="w-3.5 h-3.5" />Site web</a>}
              </div>
            )}
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
            ? <div className="flex flex-col items-center py-16 gap-3 text-center"><Calendar className="w-8 h-8 text-ink-mute" /><p className="text-[14px] font-bold text-ink">{tab === 'upcoming' ? 'Aucun concert à venir' : 'Aucun concert passé'}</p></div>
            : shown.map(event => {
              const [y,m,d] = event.date.split('T')[0].split('-').map(Number);
              const dt = new Date(y,m-1,d);
              return (
                <Link key={event.id} to={`/events/${event.id}`} className="group flex gap-4 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 hover:shadow-card transition-all">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream border border-line flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-brand uppercase">{dt.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')}</span>
                    <span className="text-[22px] font-extrabold text-ink leading-tight" style={{fontFamily:display}}>{String(d).padStart(2,'0')}</span>
                  </div>
                  {event.image_url && <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden"><img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-ink truncate group-hover:text-brand transition-colors" style={{fontFamily:display}}>{event.title}</p>
                    {event.role && <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">{event.role}</span>}
                    <div className="flex items-center gap-1.5 mt-1"><MapPin className="w-3 h-3 text-ink-mute" /><span className="text-[11px] text-ink-mute truncate">{event.location}</span></div>
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
