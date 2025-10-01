import React, { useState, useEffect } from 'react';
import { ShoppingCart, ChevronUp, ChevronDown, X, Ticket } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { TicketType } from '../../types/event';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';

interface FloatingCartSummaryProps {
  selectedTickets: { [key: string]: number };
  ticketTypes: TicketType[];
  currency: string;
  eventId: string;
  onQuantityChange: (ticketId: string, quantity: number) => void;
  onProceedToCheckout: () => void;
  onClearCart: () => void;
}

export default function FloatingCartSummary({
  selectedTickets,
  ticketTypes,
  currency,
  eventId,
  onQuantityChange,
  onProceedToCheckout,
  onClearCart
}: FloatingCartSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate totals
  const selectedItems = ticketTypes.filter(ticket => (selectedTickets[ticket.id] || 0) > 0);
  const totalQuantity = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);

  // Show/hide cart and animate when items are added
  useEffect(() => {
    if (totalQuantity > 0) {
      if (!isVisible) {
        setIsVisible(true);
      }
      setIsNewItem(true);
      const timer = setTimeout(() => setIsNewItem(false), 600);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsMinimized(false);
      setIsExpanded(false);
    }
  }, [totalQuantity, isVisible]);
  const subtotal = selectedItems.reduce((total, ticket) => {
    return total + (ticket.price * (selectedTickets[ticket.id] || 0));
  }, 0);

  const selections = selectedItems.map(t => ({ 
    ticket_type_id: t.id, 
    quantity: selectedTickets[t.id], 
    price: t.price 
  }));
  
  const { fees } = useFeeCalculation(eventId, selections);
  const processingFee = fees.total_buyer_fees || 0;
  const total = subtotal + processingFee;

  // Don't show if not visible or no tickets selected
  if (!isVisible || totalQuantity === 0) return null;

  // Minimized state - just a floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 transition-all duration-200 relative ${
            isNewItem ? 'animate-bounce' : ''
          }`}
        >
          <ShoppingCart className="h-6 w-6" />
          <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold transition-all duration-200 ${
            isNewItem ? 'scale-110' : ''
          }`}>
            {totalQuantity}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`floating-cart fixed bottom-4 right-4 z-50 max-w-sm w-full transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
      <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden transition-all duration-200 ${
        isNewItem ? 'scale-105' : ''
      }`}>
        {/* Header */}
        <div className="bg-indigo-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
              <h3 className="font-medium text-gray-900">
                Panier ({totalQuantity} billet{totalQuantity > 1 ? 's' : ''})
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-indigo-600" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-indigo-600" />
                )}
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-indigo-100 rounded transition-colors"
              >
                <X className="h-4 w-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Quick summary - always visible */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">Total</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(total, currency)}
            </span>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="space-y-3 mb-4 border-t border-gray-100 pt-3">
              {selectedItems.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">{ticket.name}</p>
                    <p className="text-gray-500">{formatCurrency(ticket.price, currency)} × {selectedTickets[ticket.id]}</p>
                  </div>
                  
                  {/* Mini quantity controls */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => onQuantityChange(ticket.id, Math.max(0, selectedTickets[ticket.id] - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-medium">
                      {selectedTickets[ticket.id]}
                    </span>
                    <button
                      onClick={() => onQuantityChange(ticket.id, selectedTickets[ticket.id] + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs"
                      disabled={selectedTickets[ticket.id] >= ticket.max_per_order}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {/* Price breakdown */}
              <div className="space-y-1 text-sm border-t border-gray-100 pt-2">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                {processingFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Frais de service</span>
                    <span>{formatCurrency(processingFee, currency)}</span>
                  </div>
                )}
              </div>

              {/* Clear cart button */}
              <button
                onClick={onClearCart}
                className="text-xs text-red-600 hover:text-red-700 transition-colors"
              >
                Vider le panier
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={onProceedToCheckout}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              <Ticket className="h-4 w-4" />
              Procéder au paiement
            </button>
            
            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Voir les détails
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
