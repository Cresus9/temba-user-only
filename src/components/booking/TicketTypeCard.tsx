import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { TicketType } from '../../types/event';
import { formatCurrency } from '../../utils/formatters';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

interface TicketTypeCardProps {
  ticket: TicketType;
  quantity: number;
  currency: string;
  onQuantityChange: (quantity: number) => void;
}

export default function TicketTypeCard({
  ticket,
  quantity,
  currency,
  onQuantityChange,
}: TicketTypeCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isPaused  = ticket.sales_enabled === false || ticket.is_paused === true || ticket.on_sale === false || ticket.is_active === false || ticket.status === 'PAUSED';
  const isSoldOut = ticket.status === 'SOLD_OUT' || ticket.available <= 0;
  const isActive  = !isPaused && !isSoldOut;

  const soldFraction = ticket.quantity > 0
    ? Math.max(0, Math.min(1, (ticket.quantity - ticket.available) / ticket.quantity))
    : 0;
  const isAlmostGone = isActive && soldFraction >= 0.8;
  const isSelling    = isActive && soldFraction >= 0.5 && !isAlmostGone;

  // ── Status badge ──────────────────────────────────────────────────────────
  const badge = isPaused
    ? { label: 'Suspendu',       cls: 'bg-amber-50 text-amber-700 border border-amber-200' }
    : isSoldOut
    ? { label: 'Épuisé',         cls: 'bg-red-50 text-red-600 border border-red-200' }
    : isAlmostGone
    ? { label: 'Presque épuisé', cls: 'bg-red-50 text-red-600 border border-red-200' }
    : isSelling
    ? { label: 'Vente rapide',   cls: 'bg-amber-50 text-amber-700 border border-amber-200' }
    : { label: 'Disponible',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };

  // ── Progress bar color ────────────────────────────────────────────────────
  const barColor = isAlmostGone ? 'bg-red-400'
    : isSelling               ? 'bg-amber-400'
    : 'bg-brand';

  const isDisabled = isPaused || isSoldOut;

  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${
        quantity > 0
          ? 'border-brand/30 bg-brand/5 shadow-sm'
          : isDisabled
          ? 'border-line bg-cream opacity-70'
          : 'border-line bg-paper hover:border-brand/30 hover:shadow-sm'
      }`}
    >
      <div className="p-4">
        {/* ── Top row: name + stepper ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-[15px] font-bold text-ink leading-snug"
              style={{ fontFamily: display }}
            >
              {ticket.name}
            </p>
            {ticket.description && (
              <p className="text-[12px] text-ink-mute mt-0.5 leading-snug">
                {ticket.description}
              </p>
            )}
          </div>

          {/* Stepper — hidden when disabled */}
          {!isDisabled && (
            <div className="flex items-center gap-2 bg-cream border border-line rounded-lg px-2 py-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                className="w-7 h-7 grid place-items-center text-brand font-bold text-[18px] hover:bg-brand-50 rounded disabled:opacity-30 transition-colors"
                aria-label="Retirer un billet"
              >
                −
              </button>
              <span
                className="w-5 text-center text-[13px] font-bold tabular-nums text-ink"
                style={{ fontFamily: mono }}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(ticket.max_per_order ?? 10, ticket.available, quantity + 1))}
                disabled={quantity >= Math.min(ticket.max_per_order ?? 10, ticket.available)}
                className="w-7 h-7 grid place-items-center text-brand font-bold text-[18px] hover:bg-brand-50 rounded disabled:opacity-30 transition-colors"
                aria-label="Ajouter un billet"
              >
                +
              </button>
            </div>
          )}

          {/* Disabled state badge */}
          {isDisabled && (
            <span
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${badge.cls}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* ── Details toggle (only if benefits exist) ── */}
        {ticket.benefits && ticket.benefits.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand/80 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
            {showDetails
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />
            }
          </button>
        )}

        {showDetails && ticket.benefits && (
          <ul className="mt-2 space-y-1 pl-1">
            {ticket.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-ink/80">
                <span className="w-1 h-1 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        )}

        {/* ── Price row ── */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p
            className="text-[17px] font-extrabold tabular-nums leading-none"
            style={{
              fontFamily: display,
              color: isDisabled ? 'var(--color-ink-mute, #9ca3af)' : 'var(--color-ink, #111)',
            }}
          >
            {formatCurrency(ticket.price, currency)}
          </p>

          {/* Availability badge — only shown when active */}
          {!isDisabled && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${badge.cls}`}>
              {/* Status dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isAlmostGone ? 'bg-red-400'
                  : isSelling  ? 'bg-amber-400'
                  : 'bg-emerald-500'
                }`}
              />
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* ── Availability bar — only shown when active ── */}
      {!isDisabled && ticket.quantity > 0 && (
        <div className="px-4 pb-4 space-y-1.5">
          {/* Progress bar */}
          <div className="h-1 w-full bg-line rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${soldFraction * 100}%` }}
            />
          </div>
          {/* Counts */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-mute" style={{ fontFamily: mono }}>
              {ticket.available} billet{ticket.available > 1 ? 's' : ''} restant{ticket.available > 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-ink-mute" style={{ fontFamily: mono }}>
              {ticket.quantity} total
            </span>
          </div>
          {/* Urgency line */}
          {isAlmostGone && (
            <p className="text-[11px] font-semibold text-red-600">
              Plus que {ticket.available} disponible{ticket.available > 1 ? 's' : ''} — réservez vite !
            </p>
          )}
        </div>
      )}
    </div>
  );
}
