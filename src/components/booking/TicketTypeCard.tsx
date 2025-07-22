import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { TicketType } from '../../types/event';
import TicketCounter from '../tickets/TicketCounter';
import TicketAvailabilityIndicator from '../tickets/TicketAvailabilityIndicator';
import { formatCurrency } from '../../utils/formatters';

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
  onQuantityChange
}: TicketTypeCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (ticket.status === 'SOLD_OUT' || ticket.available <= 0) {
    return (
      <div className="bg-gray-50 border border-[var(--gray-200)] rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-[var(--gray-900)]">{ticket.name}</h3>
            <p className="text-[var(--gray-600)]">{ticket.description}</p>
            <p className="text-lg font-bold text-[var(--gray-400)] mt-2">
              {formatCurrency(ticket.price, currency)}
            </p>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            Épuisé
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--gray-200)] rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--gray-900)]">{ticket.name}</h3>
          <p className="text-[var(--gray-600)]">{ticket.description}</p>
          
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-sm text-[var(--primary-600)] mt-2 hover:text-[var(--primary-700)]"
          >
            <Info className="h-4 w-4" />
            {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
          </button>

          {showDetails && ticket.benefits && (
            <ul className="mt-2 space-y-1">
              {ticket.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-[var(--gray-600)]">
                  <span className="w-1.5 h-1.5 bg-[var(--primary-600)] rounded-full mr-2" />
                  {benefit}
                </li>
              ))}
            </ul>
          )}

          <p className="text-lg font-bold text-[var(--gray-900)] mt-2">
            {formatCurrency(ticket.price, currency)}
          </p>
        </div>

        <TicketCounter
          available={ticket.available}
          quantity={quantity}
          maxPerOrder={ticket.max_per_order}
          onChange={onQuantityChange}
        />
      </div>

      <TicketAvailabilityIndicator
        available={ticket.available}
        total={ticket.quantity}
        status={ticket.status}
      />
    </div>
  );
}
