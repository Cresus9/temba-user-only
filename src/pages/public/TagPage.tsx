import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowLeft, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency } from '../../utils/formatters';

interface TagRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
}

interface EventCard {
  id: string;
  title: string;
  date: string;
  location: string;
  image_url: string | null;
  price: number;
  currency: string;
}

type Tab = 'upcoming' | 'past';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tag, setTag] = useState<TagRow | null>(null);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from('tags').select('*').eq('slug', slug).single();
      if (!t) { setNotFound(true); setLoading(false); return; }
      setTag(t);

      const { data: et } = await supabase
        .from('event_tags')
        .select('events(id, title, date, location, image_url, price, currency, status)')
        .eq('tag_id', t.id);

      const evts: EventCard[] = (et || [])
        .filter((row: any) => row.events?.status === 'PUBLISHED')
        .map((row: any) => row.events);
      evts.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(evts);
      setLoading(false);
    })();
  }, [slug]);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = events.filter(e => { const [y,m,d] = e.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d) >= now; });
  const past = events.filter(e => { const [y,m,d] = e.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d) < now; }).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  if (loading) return <div className="min-h-screen bg-cream bg-grain flex items-center justify-center"><div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (notFound || !tag) return (
    <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
      <Tag className="w-10 h-10 text-ink-mute" />
      <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Tag introuvable</h1>
      <Link to="/events" className="px-5 py-2.5 bg-brand text-paper rounded-xl text-[13px] font-bold">Voir les événements</Link>
    </div>
  );

  const color = tag.color || '#6D5FFC';

  return (
    <div className="min-h-screen bg-cream bg-grain">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="bg-paper border border-line rounded-2xl shadow-card p-5 sm:p-6 mb-6">
          <Link to="/events" className="flex items-center gap-1.5 text-[12px] text-ink-mute hover:text-ink mb-4 w-fit transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Événements
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
              <Tag className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-ink" style={{ fontFamily: display }}>#{tag.name}</h1>
              <p className="text-[12px] text-ink-mute">{events.length} événement{events.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {tag.description && <p className="text-[14px] text-ink/80 leading-relaxed mt-3">{tag.description}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-paper border border-line rounded-xl mb-4 w-fit">
          {(['upcoming','past'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${tab === t ? 'bg-brand text-paper shadow-sm' : 'text-ink-mute hover:text-ink'}`}>
              {t === 'upcoming' ? `À venir (${upcoming.length})` : `Passés (${past.length})`}
            </button>
          ))}
        </div>

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
