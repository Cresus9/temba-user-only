import React, { useEffect, useState } from 'react';
import { TicketType } from '../../types/event';
import { formatCurrency } from '../../utils/formatters';
import { serviceFeeService, ServiceFeeSelection, ServiceFeeResult } from '../../services/serviceFeeService';

interface BookingSummaryProps {
  selectedTickets: { [key: string]: number };
  ticketTypes: TicketType[];
  currency: string;
  eventId?: string;
}

export default function BookingSummary({
  selectedTickets,
  ticketTypes,
  currency,
  eventId
}: BookingSummaryProps) {
  const [fees, setFees] = useState<ServiceFeeResult>({ total_buyer_fees: 0, total_organizer_fees: 0, fee_breakdown: [] });

  const subtotal = ticketTypes.reduce((total, ticket) => {
    const quantity = selectedTickets[ticket.id] || 0;
    return total + (ticket.price * quantity);
  }, 0);

  useEffect(() => {
    const loadFees = async () => {
      const selections: ServiceFeeSelection[] = ticketTypes
        .filter(t => (selectedTickets[t.id] || 0) > 0)
        .map(t => ({ ticket_type_id: t.id, quantity: selectedTickets[t.id], price: t.price }));
      if (!eventId || selections.length === 0) {
        setFees({ total_buyer_fees: 0, total_organizer_fees: 0, fee_breakdown: [] });
        return;
      }
      const result = await serviceFeeService.calculateFees(eventId, selections);
      setFees(result);
    };
    loadFees();
  }, [eventId, selectedTickets, ticketTypes]);

  const processingFee = fees.total_buyer_fees;
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
            <span>Frais de service</span>
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