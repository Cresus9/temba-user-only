import React from 'react';
import { Wallet } from 'lucide-react';
import SavedPaymentMethods from './SavedPaymentMethods';

export default function PaymentMethods() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-line">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 ring-1 ring-brand-100 flex-shrink-0">
          <Wallet className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow !mb-1">Paiement</p>
          <h2
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Méthodes de paiement
          </h2>
          <p className="text-[12px] text-ink-mute mt-1">
            Vos cartes et comptes mobile money pour un checkout plus rapide.
          </p>
        </div>
      </div>

      <SavedPaymentMethods />
    </div>
  );
}
