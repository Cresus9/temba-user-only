import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { localTodayYmd, parseLocalDate } from '../../utils/formatters';
import { FadeUp } from '../common/Motion';

const display = '"Plus Jakarta Sans", Inter, sans-serif';

type Row = {
  artist_id: string;
  artists: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    genre: string | null;
    city: string | null;
  } | null;
  events: {
    id: string;
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
  photo_url: string | null;
  genre: string | null;
  nextTitle: string | null;
};

export default function ArtistsHighlight() {
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('event_artists')
        .select('artist_id, artists(id, name, slug, photo_url, genre, city), events(id, title, date, status, deleted_at)')
        .limit(120);
      if (cancelled) return;
      const today = parseLocalDate(localTodayYmd());
      const byId = new Map<string, Card & { nextTs: number }>();
      for (const row of (data || []) as Row[]) {
        const a = Array.isArray(row.artists) ? row.artists[0] : row.artists;
        const e = Array.isArray(row.events) ? row.events[0] : row.events;
        if (!a?.id || !a.slug) continue;
        if (e?.status !== 'PUBLISHED' || e.deleted_at || !e.date) continue;
        const ts = parseLocalDate(e.date).getTime();
        const existing = byId.get(a.id);
        const upcoming = parseLocalDate(e.date) >= today;
        if (!existing) {
          byId.set(a.id, {
            id: a.id,
            name: a.name,
            slug: a.slug,
            photo_url: a.photo_url,
            genre: a.genre,
            nextTitle: upcoming ? e.title : null,
            nextTs: upcoming ? ts : Number.MAX_SAFE_INTEGER,
          });
          continue;
        }
        if (upcoming && ts < existing.nextTs) {
          existing.nextTitle = e.title;
          existing.nextTs = ts;
        }
      }
      const ranked = [...byId.values()]
        .sort((x, y) => x.nextTs - y.nextTs || x.name.localeCompare(y.name, 'fr'))
        .slice(0, 10)
        .map(({ nextTs: _t, ...card }) => card);
      setItems(ranked);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="section-normal bg-cream bg-grain border-t border-line">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <FadeUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div className="max-w-2xl">
            <p className="eyebrow mb-2">À l’affiche</p>
            <h2 className="text-ink mb-2">Artistes — concerts et billets</h2>
            <p className="text-[14px] text-ink-mute">
              Fiches officielles : dates réellement mises en vente à Ouagadougou et en Afrique de l’Ouest.
            </p>
          </div>
          <Link
            to="/artists"
            className="self-start md:self-end inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand transition-colors"
          >
            Tous les artistes
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeUp>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[42vw] sm:w-[22vw] md:w-auto md:flex-1">
                <div className="aspect-[4/5] rounded-xl2 bg-cream-deep animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
              -mx-4 px-4 md:mx-0 md:px-0
              [&::-webkit-scrollbar]:hidden [scrollbar-width:none]
              md:grid md:grid-cols-5 md:overflow-visible md:pb-0 md:snap-none"
          >
            {items.map((a) => (
              <Link
                key={a.id}
                to={`/artists/${a.slug}`}
                className="group flex-shrink-0 w-[42vw] sm:w-[22vw] md:w-auto snap-start"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 bg-ink">
                  {a.photo_url ? (
                    <img
                      src={a.photo_url}
                      alt={`${a.name}, concert et billets`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-[40px] font-semibold text-white/25" style={{ fontFamily: display }}>
                        {a.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
                </div>
                <p className="mt-2.5 text-[14px] font-semibold text-ink truncate tracking-tight" style={{ fontFamily: display }}>
                  {a.name}
                </p>
                <p className="text-[12px] text-ink-mute truncate">
                  {a.nextTitle || a.genre || 'Concerts sur Temba'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
