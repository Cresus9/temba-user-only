import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { ServiceFeeBreakdownItem } from '../../services/serviceFeeService';

interface FeeBreakdownProps {
  currency: string;
  subtotal: number;
  buyerFees: number;
  items?: ServiceFeeBreakdownItem[];
}

export default function FeeBreakdown({ currency, subtotal, buyerFees, items = [] }: FeeBreakdownProps) {
  const total = subtotal + buyerFees;
  return (
    <div className="bg-cream rounded-xl2 border border-line p-3.5">
      <div className="flex justify-between text-[13px] text-ink-mute">
        <span>Sous-total</span>
        <span className="tabular-nums text-ink">{formatCurrency(subtotal, currency)}</span>
      </div>
      <div className="mt-2">
        <p className="text-[12px] font-semibold text-ink mb-1">Frais de service</p>
        {items.length > 0 ? (
          <ul className="space-y-1">
            {items.map((it, idx) => (
              <li key={idx} className="flex justify-between text-[12.5px] text-ink-mute">
                <span>{it.rule_name}</span>
                <span className="tabular-nums">{formatCurrency(it.fee_amount, currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex justify-between text-[13px] text-ink-mute">
            <span>Frais</span>
            <span className="tabular-nums text-ink">{formatCurrency(buyerFees, currency)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-baseline mt-2.5 pt-2 border-t border-line">
        <span className="text-[13px] font-bold text-ink">Total</span>
        <span
          className="text-[16px] font-bold text-ink tabular-nums tracking-tight"
          style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
        >
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
