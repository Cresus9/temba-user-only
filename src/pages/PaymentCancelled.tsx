import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, ArrowLeft, RotateCcw } from 'lucide-react';

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('order');

  const handleRetryPayment = () => {
    if (orderId) {
      // Navigate back to checkout with the order details
      navigate('/checkout', { 
        state: { 
          orderId,
          retry: true 
        }
      });
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Paiement annulé
        </h2>
        <p className="text-gray-600 mb-6">
          Votre paiement a été annulé. Aucun montant n'a été débité de votre compte.
        </p>
        <div className="space-y-4">
          <button
            onClick={handleRetryPayment}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <RotateCcw className="h-5 w-5" />
            Réessayer le paiement
          </button>
          <button
            onClick={() => navigate('/events')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour aux événements
          </button>
        </div>
      </div>
    </div>
  );
}
