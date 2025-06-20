import React from 'react';
import { TicketType } from '../../types/event';
import { formatCurrency } from '../../utils/formatters';

interface BookingSummaryProps {
  selectedTickets: { [key: string]: number };
  ticketTypes: TicketType[];
  currency: string;
}

export default function BookingSummary({
  selectedTickets,
  ticketTypes,
  currency
}: BookingSummaryProps) {
  const calculateSubtotal = () => {
    return ticketTypes.reduce((total, ticket) => {
      const quantity = selectedTickets[ticket.id] || 0;
      return total + (ticket.price * quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const processingFee = subtotal * 0.02; // 2% processing fee
  const total = subtotal + processingFee;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de la commande</h3>
      
      <div className="space-y-4">
        {ticketTypes.map((ticket) => (
          selectedTickets[ticket.id] > 0 && (
            <div key={ticket.id} className="flex justify-between text-gray-600">
              <span>{ticket.name} × {selectedTickets[ticket.id]}</span>
              <span>{formatCurrency(ticket.price * selectedTickets[ticket.id], currency)}</span>
            </div>
          )
        ))}

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Frais de traitement (2%)</span>
            <span>{formatCurrency(processingFee, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}