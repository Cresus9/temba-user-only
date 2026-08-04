import React, { useEffect, useState, useMemo } from 'react';
import {
  UtensilsCrossed, Zap, Waves, Car, ShoppingBag, Map, Camera, Package,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { getServicesForEvent, groupByCategory, type VenueService } from '../../services/venueServiceService';
import { computeAddonsTotal, type AddonSelection } from '../../services/addonService';
import { formatCurrency } from '../../utils/formatters';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

// Map Lucide icon name → component
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed, Zap, Waves, Car, ShoppingBag, Map, Camera, Package,
};
function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Comp = ICON_MAP[name ?? ''] ?? Package;
  return <Comp className={className} />;
}

interface AddonSelectorProps {
  eventId:   string;
  currency:  string;
  value:     AddonSelection;
  onChange:  (next: AddonSelection) => void;
}

export default function AddonSelector({ eventId, currency, value, onChange }: AddonSelectorProps) {
  const [services,  setServices]  = useState<VenueService[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [openCats,  setOpenCats]  = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getServicesForEvent(eventId)
      .then(data => {
        setServices(data);
        // Open the first category by default
        const groups = groupByCategory(data);
        if (groups.length) setOpenCats(new Set([groups[0].slug]));
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const groups = useMemo(() => groupByCategory(services), [services]);

  if (!loading && services.length === 0) return null;

  const toggleCat = (slug: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const setQty = (serviceId: string, qty: number, max: number | null) => {
    const clamped = Math.min(Math.max(0, qty), max ?? 99);
    onChange({ ...value, [serviceId]: clamped });
  };

  const total = computeAddonsTotal(value, services);
  const totalQty = Object.values(value).reduce((s, q) => s + q, 0);

  return (
    <div className="space-y-4">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow !mb-0.5">Améliorez votre expérience</p>
          <h3 className="text-[16px] font-bold text-ink" style={{ fontFamily: display }}>
            Services &amp; options
          </h3>
        </div>
        {totalQty > 0 && (
          <span
            className="text-[13px] font-bold text-brand tabular-nums"
            style={{ fontFamily: display }}
          >
            +{formatCurrency(total, currency)}
          </span>
        )}
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 rounded-xl bg-cream border border-line animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Category groups ── */}
      {!loading && groups.map(group => {
        const isOpen    = openCats.has(group.slug);
        const groupTotal = group.services.reduce(
          (s, svc) => s + svc.price * (value[svc.id] ?? 0), 0,
        );
        const groupQty = group.services.reduce(
          (s, svc) => s + (value[svc.id] ?? 0), 0,
        );

        return (
          <div
            key={group.slug}
            className="rounded-xl border border-line bg-paper overflow-hidden"
          >
            {/* Category header — toggle */}
            <button
              type="button"
              onClick={() => toggleCat(group.slug)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/10 grid place-items-center flex-shrink-0">
                <CategoryIcon name={group.icon} className="w-4 h-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-ink">{group.label}</p>
                <p className="text-[11px] text-ink-mute">
                  {group.services.length} option{group.services.length > 1 ? 's' : ''}
                  {groupQty > 0 && ` · ${groupQty} sélectionné${groupQty > 1 ? 's' : ''}`}
                </p>
              </div>
              {groupTotal > 0 && (
                <span className="text-[12px] font-bold text-brand tabular-nums mr-1" style={{ fontFamily: mono }}>
                  +{formatCurrency(groupTotal, currency)}
                </span>
              )}
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-ink-mute flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-ink-mute flex-shrink-0" />
              }
            </button>

            {/* Services list */}
            {isOpen && (
              <div className="border-t border-line divide-y divide-line">
                {group.services.map(svc => {
                  const qty     = value[svc.id] ?? 0;
                  const maxQty  = svc.max_per_order ?? 10;
                  const hasImg  = Boolean(svc.image_url);

                  return (
                    <div
                      key={svc.id}
                      className={`flex gap-3 px-4 py-3.5 transition-colors ${
                        qty > 0 ? 'bg-brand/5' : 'bg-paper'
                      }`}
                    >
                      {/* Photo */}
                      {hasImg && (
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-line">
                          <img
                            src={svc.image_url!}
                            alt={svc.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-ink leading-snug">{svc.name}</p>
                        {svc.description && (
                          <p className="text-[11px] text-ink-mute mt-0.5 leading-snug">
                            {svc.description}
                          </p>
                        )}
                        <p
                          className="text-[14px] font-extrabold text-ink mt-1 tabular-nums"
                          style={{ fontFamily: display }}
                        >
                          {formatCurrency(svc.price, currency)}
                          <span className="text-[11px] font-normal text-ink-mute ml-1">/ pers.</span>
                        </p>
                        {svc.max_per_order !== null && (
                          <p className="text-[10px] text-ink-mute mt-0.5">
                            Max {svc.max_per_order} par commande
                          </p>
                        )}
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-2 bg-cream border border-line rounded-lg px-2 py-1 self-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setQty(svc.id, qty - 1, maxQty)}
                          disabled={qty === 0}
                          className="w-7 h-7 grid place-items-center text-brand font-bold text-[18px] hover:bg-brand-50 rounded disabled:opacity-30 transition-colors"
                          aria-label={`Retirer ${svc.name}`}
                        >−</button>
                        <span
                          className="w-5 text-center text-[13px] font-bold tabular-nums text-ink"
                          style={{ fontFamily: mono }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(svc.id, qty + 1, maxQty)}
                          disabled={qty >= maxQty}
                          className="w-7 h-7 grid place-items-center text-brand font-bold text-[18px] hover:bg-brand-50 rounded disabled:opacity-30 transition-colors"
                          aria-label={`Ajouter ${svc.name}`}
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Addons total line ── */}
      {!loading && totalQty > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-brand/8 rounded-xl border border-brand/20">
          <p className="text-[12px] font-semibold text-brand">
            {totalQty} option{totalQty > 1 ? 's' : ''} ajoutée{totalQty > 1 ? 's' : ''}
          </p>
          <p className="text-[14px] font-extrabold text-brand tabular-nums" style={{ fontFamily: display }}>
            +{formatCurrency(total, currency)}
          </p>
        </div>
      )}
    </div>
  );
}
