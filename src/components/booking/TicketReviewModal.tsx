import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { BookingLineItem } from '../../types/booking';

interface TicketReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: BookingLineItem[];
  currency: string;
  subtotal: number;
  processingFee: number;
  total: number;
  feeLoading?: boolean;
  feeError?: string | null;
  usingFallbackFees?: boolean;
}

export default function TicketReviewModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  currency,
  subtotal,
  processingFee,
  total,
  feeLoading = false,
  feeError,
  usingFallbackFees = false
}: TicketReviewModalProps) {
  if (!isOpen) return null;

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
                  {items.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-gray-600">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {item.quantity} × {formatCurrency(item.price, currency)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Sous-total</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Frais de service{usingFallbackFees ? ' (estimés)' : ''}</span>
                      <span>{feeLoading ? 'Calcul...' : formatCurrency(processingFee, currency)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatCurrency(total, currency)}</span>
                    </div>
                  </div>

                  {(feeError || usingFallbackFees) && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                      {feeError || 'Les frais exacts seront confirmés pendant le paiement.'}
                    </div>
                  )}

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
              className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={feeLoading && !usingFallbackFees}
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

