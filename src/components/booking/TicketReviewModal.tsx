import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

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
}

export default function TicketReviewModal({
  isOpen,
  onClose,
  onConfirm,
  selectedTickets,
  ticketTypes,
  currency
}: TicketReviewModalProps) {
  if (!isOpen) return null;

  const calculateTotals = () => {
    const subtotal = ticketTypes.reduce((total, ticket) => {
      return total + (ticket.price * selectedTickets[ticket.id]);
    }, 0);
    const processingFee = subtotal * 0.02;
    return {
      subtotal,
      processingFee,
      total: subtotal + processingFee
    };
  };

  const { subtotal, processingFee, total } = calculateTotals();

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Semi-transparent overlay */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg z-[101]">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  Vérifiez votre commande
                </h3>

                <div className="space-y-4">
                  {ticketTypes.map((ticket) => (
                    selectedTickets[ticket.id] > 0 && (
                      <div key={ticket.id} className="border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{ticket.name}</h4>
                            <p className="text-sm text-gray-600">{ticket.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {selectedTickets[ticket.id]} × {formatCurrency(ticket.price, currency)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(ticket.price * selectedTickets[ticket.id], currency)}
                            </p>
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
                      <span>Frais de traitement (2%)</span>
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
              className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
            >
              Procéder au paiement
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Retour à la sélection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}