import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { localTodayYmd, parseLocalDate } from '../../utils/formatters';
import { eventPublicPath } from '../../utils/eventPath';
import { FadeUp } from '../common/Motion';
import { useEvents } from '../../context/EventContext';
import { Event } from '../../types/event';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const MAX = 4;

type Card = {
  id: string;
  name: string;
  slug: string;
  photo_url: string;
  nextTitle: string;
  nextDate: string;
  nextTs: number;
  eventId: string;
  eventSlug?: string | null;
};

export default function ArtistsHighlight() {
  const { events, loading: eventsLoading } = useEvents();
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const upcomingById = useMemo(() => {
    const today = localTodayYmd();
    const map = new Map<string, Event>();
    for (const e of events) {
      if (e.is_permanent || !e.date || e.date < today) continue;
      map.set(e.id, e);
    }
    return map;
  }, [events]);

  useEffect(() => {
    if (eventsLoading) return;

    const eventIds = [...upcomingById.keys()];
    if (eventIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: links, error: linkErr } = await supabase
        .from('event_artists')
        .select('event_id, artist_id')
        .in('event_id', eventIds.slice(0, 80));

      if (cancelled) return;
      if (linkErr || !links?.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const artistIds = [...new Set(links.map((r) => r.artist_id).filter(Boolean))];
      const { data: artists, error: artistErr } = await supabase
        .from('artists')
        .select('id, name, slug, photo_url')
        .in('id', artistIds);

      if (cancelled) return;
      if (artistErr || !artists?.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const byArtist = new Map<string, (typeof artists)[number]>(
        artists.map((a) => [a.id, a])
      );
      const cards = new Map<string, Card>();

      for (const link of links) {
        const artist = byArtist.get(link.artist_id);
        const event = upcomingById.get(link.event_id);
        const photo = artist?.photo_url?.trim();
        if (!artist?.id || !artist.slug || !photo || !event?.date) continue;
        const ts = parseLocalDate(event.date).getTime();
        const existing = cards.get(artist.id);
        if (!existing || ts < existing.nextTs) {
          cards.set(artist.id, {
            id: artist.id,
            name: artist.name,
            slug: artist.slug,
            photo_url: photo,
            nextTitle: event.title,
            nextDate: event.date,
            nextTs: ts,
            eventId: event.id,
            eventSlug: event.slug,
          });
        }
      }

      setItems(
        [...cards.values()]
          .sort((x, y) => x.nextTs - y.nextTs || x.name.localeCompare(y.name, 'fr'))
          .slice(0, MAX)
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [eventsLoading, upcomingById]);

  if (!loading && !eventsLoading && items.length === 0) return null;

  return (
    <section>
      <FadeUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow mb-2">À l’affiche</p>
          <h2 className="text-ink">Artistes en concert</h2>
        </div>
        <Link
          to="/artists"
          className="self-start md:self-end inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand"
        >
          Tous les artistes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </FadeUp>

      <div className="space-y-2.5">
        {loading || eventsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse bg-paper border border-line rounded-xl2 p-3">
                <div className="w-20 h-20 bg-line rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-line rounded w-1/3" />
                  <div className="h-3 bg-line rounded w-1/2" />
                </div>
              </div>
            ))
          : items.map((a) => {
              const d = parseLocalDate(a.nextDate);
              const day = String(d.getDate()).padStart(2, '0');
              const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
              const weekday = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
              return (
                <Link
                  key={a.id}
                  to={eventPublicPath({ id: a.eventId, slug: a.eventSlug })}
                  className="group flex items-center gap-3 bg-paper border border-line rounded-xl2 hover:border-ink hover:shadow-card-hover transition-all duration-200 p-3"
                >
                  <div className="hidden sm:flex flex-col items-center justify-center w-14 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-mute">{weekday}</span>
                    <span className="text-[22px] font-bold text-ink leading-none mt-0.5 tabular-nums" style={{ fontFamily: display }}>
                      {day}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-accent mt-0.5">{month}</span>
                  </div>
                  <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-xl overflow-hidden flex-shrink-0 bg-ink">
                    <img
                      src={a.photo_url}
                      alt={`${a.name}, concert et billets`}
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-mute mb-0.5 sm:hidden">
                      {weekday} {day} {month}
                    </p>
                    <h3 className="text-[15px] font-bold text-ink tracking-tight truncate" style={{ fontFamily: display }}>
                      {a.name}
                    </h3>
                    <p className="text-[13px] text-ink-mute truncate">{a.nextTitle}</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand text-paper rounded-xl text-[13px] font-semibold group-hover:bg-brand-700 transition-colors flex-shrink-0">
                    Billets
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
