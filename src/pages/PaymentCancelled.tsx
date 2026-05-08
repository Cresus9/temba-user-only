import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, ArrowLeft, RotateCcw } from 'lucide-react';

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('order');

  const handleRetryPayment = () => {
    if (orderId) {
      navigate('/checkout', {
        state: {
          orderId,
          retry: true,
        },
      });
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl2 border border-line bg-paper shadow-pop overflow-hidden">
        <div className="px-5 py-3 bg-cream border-b border-line flex items-center justify-between">
          <span className="eyebrow !text-ink">Annulé</span>
          {orderId && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              ORD · {orderId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </div>

        <div className="p-7 text-center space-y-4">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-red-50 mx-auto ring-1 ring-red-200">
            <X className="h-7 w-7 text-red-600" />
          </div>
          <h2
            className="text-ink text-[20px] font-bold tracking-tight"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Paiement annulé
          </h2>
          <p className="text-[13px] text-ink-mute leading-relaxed">
            Aucun montant n'a été débité de votre compte.
            <br />
            Vous pouvez réessayer quand vous voulez.
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleRetryPayment}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-brand hover:bg-brand-700 text-paper text-[14px] font-bold transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Réessayer le paiement
            </button>
            <button
              onClick={() => navigate('/events')}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper text-ink text-[14px] font-medium hover:border-brand/40 hover:text-brand transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux événements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
