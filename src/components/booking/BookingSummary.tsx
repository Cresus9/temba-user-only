import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { BookingLineItem } from '../../types/booking';

interface BookingSummaryProps {
  items: BookingLineItem[];
  currency: string;
  subtotal: number;
  processingFee: number;
  total: number;
  feeLoading?: boolean;
  feeError?: string | null;
  usingFallbackFees?: boolean;
}

export default function BookingSummary({
  items,
  currency,
  subtotal,
  processingFee,
  total,
  feeLoading = false,
  feeError,
  usingFallbackFees = false
}: BookingSummaryProps) {
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de la commande</h3>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-gray-600">
            <span>{item.name} × {item.quantity}</span>
            <span>{formatCurrency(item.price * item.quantity, currency)}</span>
          </div>
        ))}

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Frais de service</span>
            <span>
              {feeLoading ? 'Calcul...' : formatCurrency(processingFee, currency)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        {(feeError || usingFallbackFees) && (
          <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md p-3">
            {feeError || 'Impossible de confirmer les frais en temps réel. Un taux standard a été appliqué.'}
          </div>
        )}
      </div>
    </div>
  );
}
