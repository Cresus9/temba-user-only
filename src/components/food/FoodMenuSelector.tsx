import React, { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Leaf, Star, UtensilsCrossed } from 'lucide-react';
import {
  getMenuForEvent,
  computeFoodTotal,
  type FoodMenuCategory,
  type FoodSelection,
} from '../../services/foodMenuService';
import { formatCurrency } from '../../utils/formatters';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

interface FoodMenuSelectorProps {
  eventId:  string;
  currency: string;
  value:    FoodSelection;
  onChange: (next: FoodSelection, categories: FoodMenuCategory[]) => void;
}

export default function FoodMenuSelector({
  eventId,
  currency,
  value,
  onChange,
}: FoodMenuSelectorProps) {
  const [categories, setCategories] = useState<FoodMenuCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [openCats,   setOpenCats]   = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getMenuForEvent(eventId)
      .then(data => {
        setCategories(data);
        // Open first category by default
        if (data.length) setOpenCats(new Set([data[0].id]));
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  if (!loading && categories.length === 0) return null;

  const total    = useMemo(() => computeFoodTotal(value, categories), [value, categories]);
  const totalQty = Object.values(value).reduce((s, q) => s + q, 0);

  const toggleCat = (id: string) =>
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const setQty = (itemId: string, qty: number) => {
    const next = { ...value, [itemId]: Math.max(0, qty) };
    onChange(next, categories);
  };

  return (
    <div className="space-y-4">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow !mb-0.5">À la carte</p>
          <h3 className="text-[16px] font-bold text-ink" style={{ fontFamily: display }}>
            Menu &amp; Restauration
          </h3>
        </div>
        {totalQty > 0 && (
          <span className="text-[13px] font-bold text-brand tabular-nums" style={{ fontFamily: display }}>
            +{formatCurrency(total, currency)}
          </span>
        )}
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-cream border border-line animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Categories ── */}
      {!loading && categories.map(cat => {
        const isOpen   = openCats.has(cat.id);
        const catTotal = cat.items.reduce((s, item) => s + item.price * (value[item.id] ?? 0), 0);
        const catQty   = cat.items.reduce((s, item) => s + (value[item.id] ?? 0), 0);
        const availableItems = cat.items.filter(i => i.is_available);

        if (availableItems.length === 0) return null;

        return (
          <div key={cat.id} className="rounded-xl border border-line bg-paper overflow-hidden">
            {/* Category header */}
            <button
              type="button"
              onClick={() => toggleCat(cat.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/10 grid place-items-center flex-shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-ink">{cat.name}</p>
                <p className="text-[11px] text-ink-mute">
                  {availableItems.length} plat{availableItems.length > 1 ? 's' : ''}
                  {catQty > 0 && ` · ${catQty} sélectionné${catQty > 1 ? 's' : ''}`}
                </p>
              </div>
              {catTotal > 0 && (
                <span className="text-[12px] font-bold text-brand tabular-nums mr-1" style={{ fontFamily: mono }}>
                  +{formatCurrency(catTotal, currency)}
                </span>
              )}
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-ink-mute flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-ink-mute flex-shrink-0" />
              }
            </button>

            {/* Items */}
            {isOpen && (
              <div className="border-t border-line divide-y divide-line">
                {availableItems.map(item => {
                  const qty = value[item.id] ?? 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 px-4 py-3.5 transition-colors ${
                        qty > 0 ? 'bg-brand/5' : 'bg-paper'
                      }`}
                    >
                      {/* Photo */}
                      {item.image_url ? (
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-line">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream border border-line grid place-items-center">
                          <UtensilsCrossed className="w-5 h-5 text-ink-mute/50" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-bold text-ink leading-snug">{item.name}</p>
                          {item.is_featured && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                          {item.is_vegetarian && (
                            <Leaf className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-ink-mute mt-0.5 leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <p
                          className="text-[14px] font-extrabold text-ink mt-1.5 tabular-nums"
                          style={{ fontFamily: display }}
                        >
                          {formatCurrency(item.price, currency)}
                        </p>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-2 bg-cream border border-line rounded-lg px-2 py-1 self-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setQty(item.id, qty - 1)}
                          disabled={qty === 0}
                          className="w-7 h-7 grid place-items-center text-brand font-bold text-[18px] hover:bg-brand/10 rounded disabled:opacity-30 transition-colors"
                          aria-label={`Retirer ${item.name}`}
                        >−</button>
                        <span
                          className="w-5 text-center text-[13px] font-bold tabular-nums text-ink"
                          style={{ fontFamily: mono }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.id, qty + 1)}
                          className="w-7 h-7 grid place-items-center text-brand font-bold text-[18px] hover:bg-brand/10 rounded transition-colors"
                          aria-label={`Ajouter ${item.name}`}
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

      {/* ── Legend ── */}
      {!loading && categories.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <span className="flex items-center gap-1 text-[11px] text-ink-mute">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Recommandé
          </span>
          <span className="flex items-center gap-1 text-[11px] text-ink-mute">
            <Leaf className="w-3 h-3 text-emerald-500" /> Végétarien
          </span>
        </div>
      )}

      {/* ── Food total line ── */}
      {!loading && totalQty > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-brand/8 rounded-xl border border-brand/20">
          <p className="text-[12px] font-semibold text-brand">
            {totalQty} plat{totalQty > 1 ? 's' : ''} sélectionné{totalQty > 1 ? 's' : ''}
          </p>
          <p className="text-[14px] font-extrabold text-brand tabular-nums" style={{ fontFamily: display }}>
            +{formatCurrency(total, currency)}
          </p>
        </div>
      )}
    </div>
  );
}
