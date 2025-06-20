import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { TicketType } from '../../types/event';
import TicketCounter from '../tickets/TicketCounter';
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

  if (ticket.status === 'SOLD_OUT') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{ticket.name}</h3>
            <p className="text-gray-600">{ticket.description}</p>
            <p className="text-lg font-bold text-gray-400 mt-2">
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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{ticket.name}</h3>
          <p className="text-gray-600">{ticket.description}</p>
          
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-sm text-indigo-600 mt-2 hover:text-indigo-700"
          >
            <Info className="h-4 w-4" />
            {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
          </button>

          {showDetails && ticket.benefits && (
            <ul className="mt-2 space-y-1">
              {ticket.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-2" />
                  {benefit}
                </li>
              ))}
            </ul>
          )}

          <p className="text-lg font-bold text-gray-900 mt-2">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">
            {ticket.available} / {ticket.quantity} billets disponibles
          </span>
          {ticket.available <= 10 && (
            <span className="text-red-600 font-medium">Presque épuisé</span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${Math.min((ticket.available / ticket.quantity) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}