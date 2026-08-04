import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Ticket } from 'lucide-react';
import { listAttractions, ATTRACTION_TYPE_LABELS, ATTRACTION_TYPE_ICONS } from '../../services/permanentVenueService';
import { formatCurrency } from '../../utils/formatters';
import { FadeUp, Stagger, StaggerItem } from '../common/Motion';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export default function AttractionsHighlight() {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAttractions().then(data => {
      setItems(data.slice(0, 6));
      setLoading(false);
    });
  }, []);

  // Don't render the section if there are no attractions
  if (!loading && items.length === 0) return null;

  const lowestPrice = (a: any): number | null => {
    const tts = (a.ticket_types ?? []).filter((t: any) => t.available > 0);
    if (!tts.length) return null;
    return Math.min(...tts.map((t: any) => t.price));
  };

  return (
    <section className="section-normal bg-paper border-t border-line">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* ── Header ── */}
        <FadeUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div className="max-w-2xl">
            <p className="eyebrow mb-2">Ouvert toute l'année</p>
            <h2 className="text-ink mb-2">Attractions &amp; Lieux permanents</h2>
            <p className="text-[14px] text-ink-mute">
              Zoos, parcs, musées — réservez votre visite à n'importe quel moment.
            </p>
          </div>
          <Link
            to="/attractions"
            className="self-start md:self-end inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand transition-colors"
          >
            Voir toutes les attractions
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeUp>

        {/* ── Skeleton ── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl2 border border-line bg-cream overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-cream-deep" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 bg-cream-deep rounded" />
                  <div className="h-3 w-1/2 bg-cream-deep rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Cards ── */}
        {!loading && items.length > 0 && (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(a => {
              const minPrice  = lowestPrice(a);
              const typeIcon  = ATTRACTION_TYPE_ICONS[a.attraction_type ?? 'other'] ?? '📍';
              const typeLabel = ATTRACTION_TYPE_LABELS[a.attraction_type ?? 'other'] ?? '';

              return (
                <StaggerItem key={a.id}>
                  <Link
                    to={`/events/${a.id}`}
                    className="group flex flex-col rounded-xl2 border border-line bg-paper overflow-hidden shadow-card hover:shadow-brand-sm hover:-translate-y-0.5 transition-all duration-200 h-full"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/9] sm:aspect-[4/3] bg-cream-deep overflow-hidden flex-shrink-0">
                      {a.image_url ? (
                        <img
                          src={a.image_url}
                          alt={a.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center bg-brand-50">
                          <span className="text-[44px]">{typeIcon}</span>
                        </div>
                      )}

                      {/* Type badge */}
                      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-ink/65 backdrop-blur-sm rounded-md">
                        <span className="text-[10px]">{typeIcon}</span>
                        <span
                          className="text-[9px] font-bold text-paper uppercase tracking-[0.1em]"
                          style={{ fontFamily: mono }}
                        >
                          {typeLabel}
                        </span>
                      </span>

                      {/* Always open pill */}
                      <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-emerald-500 rounded-md">
                        <span
                          className="text-[9px] font-bold text-paper uppercase tracking-[0.1em]"
                          style={{ fontFamily: mono }}
                        >
                          Ouvert
                        </span>
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1 p-3.5 flex-1">
                      <h3
                        className="text-[13px] font-bold text-ink leading-snug group-hover:text-brand transition-colors line-clamp-2"
                        style={{ fontFamily: display }}
                      >
                        {a.title}
                      </h3>

                      {(a.city || a.location) && (
                        <p className="flex items-center gap-1 text-[11px] text-ink-mute truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{a.city ?? a.location}</span>
                        </p>
                      )}

                      {/* Price + CTA */}
                      <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
                        <p
                          className="text-[12px] font-bold text-brand tabular-nums"
                          style={{ fontFamily: display }}
                        >
                          {minPrice !== null
                            ? `Dès ${formatCurrency(minPrice, a.currency ?? 'XOF')}`
                            : 'Voir les tarifs'}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand/8 text-brand rounded-lg text-[10px] font-bold transition-colors group-hover:bg-brand group-hover:text-paper">
                          <Ticket className="w-3 h-3" />
                          Réserver
                        </span>
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}

        {/* ── Bottom CTA strip ── */}
        {!loading && items.length > 0 && (
          <FadeUp className="mt-6 flex justify-center">
            <Link
              to="/attractions"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-line bg-cream hover:bg-brand-50 hover:border-brand/30 text-[13px] font-semibold text-ink hover:text-brand transition-all"
            >
              Explorer toutes les attractions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>
        )}
      </div>
    </section>
  );
}
