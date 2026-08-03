import React from 'react';
import { Sun, Moon, CalendarDays } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import type { PricingOverride } from '../../services/permanentVenueService';
import type { TicketType } from '../../types/event';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const DAY_TYPE_CONFIG = {
  weekday: {
    label: 'Semaine',
    icon:  Sun,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot:   'bg-amber-400',
  },
  weekend: {
    label: 'Week-end',
    icon:  Moon,
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot:   'bg-violet-400',
  },
  holiday: {
    label: 'Jour férié',
    icon:  CalendarDays,
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot:   'bg-rose-400',
  },
} as const;

interface DayTypePricingTableProps {
  ticketTypes: TicketType[];
  overrides:   PricingOverride[];
  currency:    string;
  /** Highlight the currently selected day type */
  activeDayType?: 'weekday' | 'weekend' | 'holiday' | null;
}

export default function DayTypePricingTable({
  ticketTypes,
  overrides,
  currency,
  activeDayType,
}: DayTypePricingTableProps) {
  if (!ticketTypes.length) return null;

  // Build a lookup: ticketTypeId → { weekday, weekend, holiday }
  const overrideMap: Record<string, Partial<Record<'weekday' | 'weekend' | 'holiday', number>>> = {};
  overrides.forEach(o => {
    if (!overrideMap[o.ticket_type_id]) overrideMap[o.ticket_type_id] = {};
    overrideMap[o.ticket_type_id][o.day_type] = o.price;
  });

  // Only show day-type columns that actually have at least one override
  const activeDayTypes = (['weekday', 'weekend', 'holiday'] as const).filter(dt =>
    overrides.some(o => o.day_type === dt)
  );

  // If no overrides at all, show simple pricing
  if (activeDayTypes.length === 0) {
    return (
      <div className="space-y-2">
        {ticketTypes.map(tt => (
          <div
            key={tt.id}
            className="flex items-center justify-between py-2 border-b border-line last:border-0"
          >
            <span className="text-[13px] text-ink">{tt.name}</span>
            <span
              className="text-[14px] font-bold text-brand tabular-nums"
              style={{ fontFamily: display }}
            >
              {formatCurrency(tt.price, currency)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[280px] text-[12px]">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2 pr-3 text-left font-bold text-ink-mute uppercase tracking-[0.08em] text-[10px]"
              style={{ fontFamily: mono }}>
              Tarif
            </th>
            {activeDayTypes.map(dt => {
              const cfg = DAY_TYPE_CONFIG[dt];
              const Icon = cfg.icon;
              const isActive = activeDayType === dt;
              return (
                <th
                  key={dt}
                  className={`py-2 px-2 text-center transition-colors ${
                    isActive ? 'text-brand' : 'text-ink-mute'
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all ${
                    isActive
                      ? 'bg-brand/10 text-brand border-brand/20 scale-105'
                      : cfg.badge
                  }`}>
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ticketTypes.map(tt => {
            const ttOverrides = overrideMap[tt.id] ?? {};
            return (
              <tr key={tt.id} className="border-b border-line/50 last:border-0">
                <td className="py-2.5 pr-3">
                  <p className="font-semibold text-ink text-[13px]">{tt.name}</p>
                  {tt.description && (
                    <p className="text-[11px] text-ink-mute truncate max-w-[120px]">{tt.description}</p>
                  )}
                </td>
                {activeDayTypes.map(dt => {
                  const price    = ttOverrides[dt] ?? tt.price;
                  const isBase   = !ttOverrides[dt];
                  const isActive = activeDayType === dt;
                  return (
                    <td
                      key={dt}
                      className={`py-2.5 px-2 text-center transition-all ${
                        isActive ? 'bg-brand/5 rounded' : ''
                      }`}
                    >
                      <p
                        className={`font-bold tabular-nums text-[13px] ${
                          isActive ? 'text-brand' : 'text-ink'
                        }`}
                        style={{ fontFamily: display }}
                      >
                        {formatCurrency(price, currency)}
                      </p>
                      {isActive && !isBase && (
                        <p className="text-[9px] text-brand/70 font-semibold uppercase tracking-wide"
                          style={{ fontFamily: mono }}>
                          tarif {DAY_TYPE_CONFIG[dt].label.toLowerCase()}
                        </p>
                      )}
                      {isBase && (
                        <p className="text-[9px] text-ink-mute" style={{ fontFamily: mono }}>
                          standard
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
