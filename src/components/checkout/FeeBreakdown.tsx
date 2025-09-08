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
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Sous-total</span>
        <span>{formatCurrency(subtotal, currency)}</span>
      </div>
      <div className="mt-2">
        <div className="text-sm font-medium text-gray-700">Frais de service</div>
        {items.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {items.map((it, idx) => (
              <li key={idx} className="flex justify-between text-sm text-gray-600">
                <span>{it.rule_name}</span>
                <span>{formatCurrency(it.fee_amount, currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Frais</span>
            <span>{formatCurrency(buyerFees, currency)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-base font-semibold text-gray-900 mt-3 border-t pt-2">
        <span>Total</span>
        <span>{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}


