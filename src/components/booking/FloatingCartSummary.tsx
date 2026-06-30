import React, { useState, useEffect } from 'react';
import { ShoppingCart, ChevronUp, ChevronDown, X, Ticket, Calendar, Loader } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { TicketType } from '../../types/event';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';

const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

interface FloatingCartSummaryProps {
  selectedTickets: { [key: string]: number };
  ticketTypes: TicketType[];
  currency: string;
  eventId: string;
  selectedDateId?: string | null;
  eventDates?: Array<{ id: string; date: string; start_time: string; end_time?: string | null }>;
  onQuantityChange: (ticketId: string, quantity: number) => void;
  onProceedToCheckout: () => void;
  onClearCart: () => void;
}

export default function FloatingCartSummary({
  selectedTickets,
  ticketTypes,
  currency,
  eventId,
  selectedDateId,
  eventDates,
  onQuantityChange,
  onProceedToCheckout,
  onClearCart,
}: FloatingCartSummaryProps) {
  const [isExpanded, setIsExpanded]   = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pulse, setPulse]             = useState(false);
  const [isVisible, setIsVisible]     = useState(false);

  const selectedItems = ticketTypes.filter(t => (selectedTickets[t.id] || 0) > 0);
  const totalQuantity = Object.values(selectedTickets).reduce((s, q) => s + q, 0);

  useEffect(() => {
    if (totalQuantity > 0) {
      if (!isVisible) setIsVisible(true);
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    } else {
      setIsVisible(false);
      setIsMinimized(false);
      setIsExpanded(false);
    }
  }, [totalQuantity]);

  const subtotal = selectedItems.reduce(
    (s, t) => s + t.price * (selectedTickets[t.id] || 0),
    0
  );
  const selections = selectedItems.map(t => ({
    ticket_type_id: t.id,
    quantity: selectedTickets[t.id],
    price: t.price,
  }));
  const { fees } = useFeeCalculation(eventId, selections);
  const processingFee = fees.total_buyer_fees || 0;
  const total = subtotal + processingFee;

  if (!isVisible || totalQuantity === 0) return null;

  // ── Minimised bubble ────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`relative w-14 h-14 rounded-2xl bg-brand text-paper shadow-pop flex items-center justify-center hover:bg-brand/90 active:scale-95 transition-all ${
            pulse ? 'scale-110' : ''
          }`}
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-accent text-paper text-[11px] font-bold flex items-center justify-center tabular-nums ring-2 ring-paper">
            {totalQuantity}
          </span>
        </button>
      </div>
    );
  }

  // ── Full cart ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 w-[min(100vw-2.5rem,360px)] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div
        className={`bg-paper rounded-2xl border border-line shadow-pop overflow-hidden transition-transform duration-200 ${
          pulse ? 'scale-[1.02]' : ''
        }`}
      >
        {/* ── Header */}
        <div className="bg-cream border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand grid place-items-center flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-paper" />
            </div>
            <div>
              <p
                className="text-[13px] font-bold text-ink leading-tight"
                style={{ fontFamily: display }}
              >
                Panier
              </p>
              <p className="text-[10px] text-ink-mute" style={{ fontFamily: mono }}>
                {totalQuantity} billet{totalQuantity > 1 ? 's' : ''} · {formatCurrency(total, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(e => !e)}
              className="w-7 h-7 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-ink hover:bg-cream transition-colors"
              aria-label={isExpanded ? 'Réduire' : 'Détails'}
            >
              {isExpanded
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="w-7 h-7 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-ink hover:bg-cream transition-colors"
              aria-label="Réduire"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Body */}
        <div className="px-4 py-3 space-y-3">

          {/* Expanded: ticket rows + date + breakdown */}
          {isExpanded && (
            <div className="space-y-3">
              {/* Selected date */}
              {selectedDateId && eventDates && eventDates.length > 0 && (() => {
                const d = eventDates.find(ev => ev.id === selectedDateId);
                if (!d) return null;
                const label = new Date(d.date).toLocaleDateString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short',
                }) + ` · ${d.start_time}`;
                return (
                  <div className="flex items-center gap-2 p-2.5 bg-brand-50 border border-brand/15 rounded-xl">
                    <Calendar className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                    <span className="text-[12px] font-semibold text-brand">{label}</span>
                  </div>
                );
              })()}

              {/* Ticket rows */}
              {selectedItems.map(ticket => (
                <div key={ticket.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-ink truncate">{ticket.name}</p>
                    <p className="text-[11px] text-ink-mute tabular-nums">
                      {formatCurrency(ticket.price, currency)} × {selectedTickets[ticket.id]}
                    </p>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1 bg-cream border border-line rounded-lg px-1 py-0.5 flex-shrink-0">
                    <button
                      onClick={() => onQuantityChange(ticket.id, Math.max(0, selectedTickets[ticket.id] - 1))}
                      className="w-6 h-6 rounded grid place-items-center text-brand font-bold text-[15px] hover:bg-brand-50 transition-colors"
                    >
                      −
                    </button>
                    <span
                      className="w-6 text-center text-[12px] font-bold tabular-nums"
                      style={{ fontFamily: mono }}
                    >
                      {selectedTickets[ticket.id]}
                    </span>
                    <button
                      onClick={() => onQuantityChange(ticket.id, selectedTickets[ticket.id] + 1)}
                      disabled={selectedTickets[ticket.id] >= ticket.max_per_order}
                      className="w-6 h-6 rounded grid place-items-center text-brand font-bold text-[15px] hover:bg-brand-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  <span
                    className="text-[12px] font-bold text-ink w-[68px] text-right tabular-nums flex-shrink-0"
                    style={{ fontFamily: mono }}
                  >
                    {formatCurrency(ticket.price * selectedTickets[ticket.id], currency)}
                  </span>
                </div>
              ))}

              {/* Price breakdown */}
              <div className="border-t border-line pt-2.5 space-y-1">
                <div className="flex justify-between text-[12px] text-ink-mute">
                  <span>Sous-total</span>
                  <span className="tabular-nums font-medium text-ink">{formatCurrency(subtotal, currency)}</span>
                </div>
                {processingFee > 0 && (
                  <div className="flex justify-between text-[12px] text-ink-mute">
                    <span>Frais de service</span>
                    <span className="tabular-nums font-medium text-ink">{formatCurrency(processingFee, currency)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={onClearCart}
                className="text-[11px] text-red-500 hover:text-red-600 transition-colors"
              >
                Vider le panier
              </button>
            </div>
          )}

          {/* Total row — always visible */}
          {!isExpanded && (
            <div className="flex justify-between items-baseline">
              <span className="text-[12px] text-ink-mute font-semibold uppercase tracking-wide" style={{ fontFamily: mono }}>
                Total
              </span>
              <span
                className="text-[16px] font-bold text-ink tabular-nums"
                style={{ fontFamily: display }}
              >
                {formatCurrency(total, currency)}
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onProceedToCheckout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-paper text-[13px] font-bold hover:bg-brand/90 active:scale-[0.98] transition-all shadow-card"
          >
            <Ticket className="w-4 h-4" />
            Procéder au paiement
          </button>

          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-[11px] text-ink-mute hover:text-brand transition-colors font-medium"
            >
              Voir le détail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
