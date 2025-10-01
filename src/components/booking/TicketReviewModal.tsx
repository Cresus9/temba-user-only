import React, { useMemo, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface TicketReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedTickets: { [key: string]: number };
  selectedSeats?: string[];
  ticketTypes: TicketType[];
  currency: string;
  eventId: string;
  onQuantityChange?: (ticketId: string, quantity: number) => void;
}

export default function TicketReviewModal({
  isOpen,
  onClose,
  onConfirm,
  selectedTickets,
  ticketTypes,
  currency,
  eventId,
  onQuantityChange
}: TicketReviewModalProps) {
  if (!isOpen) return null;

  const subtotal = useMemo(() => {
    return ticketTypes.reduce((total, ticket) => {
      return total + (ticket.price * (selectedTickets[ticket.id] || 0));
    }, 0);
  }, [ticketTypes, selectedTickets]);

  const selections = useMemo(() => {
    return ticketTypes
      .filter(t => (selectedTickets[t.id] || 0) > 0)
      .map(t => ({ ticket_type_id: t.id, quantity: selectedTickets[t.id], price: t.price }));
  }, [ticketTypes, selectedTickets]);

  const { fees } = useFeeCalculation(eventId, selections);
  const processingFee = fees.total_buyer_fees || 0;
  const total = subtotal + processingFee;

  // Hide map when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  return (
    <div className="modal-backdrop fixed inset-0 z-[99999] overflow-y-auto" style={{ isolation: 'isolate' }}>
      {/* Semi-transparent overlay */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 relative z-[100000]">
        <div className="modal-content relative transform overflow-hidden rounded-lg bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ isolation: 'isolate' }}>
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Vérifiez votre commande
                  </h3>
                  {onQuantityChange && (
                    <p className="text-sm text-gray-600 mt-1">
                      Vous pouvez encore modifier les quantités avant de continuer
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {ticketTypes.map((ticket) => (
                    selectedTickets[ticket.id] > 0 && (
                      <div key={ticket.id} className="border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{ticket.name}</h4>
                            <p className="text-sm text-gray-600">{ticket.description}</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {formatCurrency(ticket.price, currency)} / billet
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Quantity controls */}
                            {onQuantityChange && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onQuantityChange(ticket.id, Math.max(0, selectedTickets[ticket.id] - 1))}
                                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 text-gray-600"
                                  disabled={selectedTickets[ticket.id] <= 0}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {selectedTickets[ticket.id]}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onQuantityChange(ticket.id, selectedTickets[ticket.id] + 1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 text-gray-600"
                                  disabled={selectedTickets[ticket.id] >= ticket.max_per_order}
                                >
                                  +
                                </button>
                              </div>
                            )}
                            
                            <div className="text-right min-w-[80px]">
                              <p className="font-medium text-gray-900">
                                {formatCurrency(ticket.price * selectedTickets[ticket.id], currency)}
                              </p>
                              {!onQuantityChange && (
                                <p className="text-xs text-gray-500">
                                  {selectedTickets[ticket.id]} × {formatCurrency(ticket.price, currency)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ))}

                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Sous-total</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Frais de service</span>
                      <span>{formatCurrency(processingFee, currency)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatCurrency(total, currency)}</span>
                    </div>
                  </div>

                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm">
                        Veuillez vérifier attentivement votre commande. Les billets ne peuvent pas être remboursés ou échangés après l'achat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={Object.values(selectedTickets).every(qty => qty === 0)}
            >
              Procéder au paiement
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              {onQuantityChange ? 'Continuer la sélection' : 'Retour à la sélection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}