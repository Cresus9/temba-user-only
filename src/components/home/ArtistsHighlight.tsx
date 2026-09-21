import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { localTodayYmd, parseLocalDate } from '../../utils/formatters';
import { eventPublicPath } from '../../utils/eventPath';
import { FadeUp } from '../common/Motion';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const MAX = 4;

type Row = {
  artists: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
  } | null;
  events: {
    id: string;
    slug?: string | null;
    title: string;
    date: string | null;
    status: string | null;
    deleted_at: string | null;
  } | null;
};

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
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('event_artists')
        .select('artists(id, name, slug, photo_url), events(id, slug, title, date, status, deleted_at)')
        .limit(120);
      if (cancelled) return;
      const today = parseLocalDate(localTodayYmd());
      const byId = new Map<string, Card>();
      for (const row of (data || []) as Row[]) {
        const a = Array.isArray(row.artists) ? row.artists[0] : row.artists;
        const e = Array.isArray(row.events) ? row.events[0] : row.events;
        const photo = a?.photo_url?.trim();
        if (!a?.id || !a.slug || !photo || !e?.id) continue;
        if (e.status !== 'PUBLISHED' || e.deleted_at || !e.date) continue;
        const when = parseLocalDate(e.date);
        if (when < today) continue;
        const ts = when.getTime();
        const existing = byId.get(a.id);
        if (!existing || ts < existing.nextTs) {
          byId.set(a.id, {
            id: a.id,
            name: a.name,
            slug: a.slug,
            photo_url: photo,
            nextTitle: e.title,
            nextDate: e.date,
            nextTs: ts,
            eventId: e.id,
            eventSlug: e.slug,
          });
        }
      }
      setItems(
        [...byId.values()]
          .sort((x, y) => x.nextTs - y.nextTs || x.name.localeCompare(y.name, 'fr'))
          .slice(0, MAX)
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && items.length === 0) return null;

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
        {loading
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
