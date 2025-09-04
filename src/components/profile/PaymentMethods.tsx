import React from 'react';
import SavedPaymentMethods from './SavedPaymentMethods';

export default function PaymentMethods() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Méthodes de paiement</h1>
        <p className="text-gray-600">
          Gérez vos méthodes de paiement sauvegardées pour un checkout plus rapide
        </p>
      </div>
      
      <SavedPaymentMethods />
    </div>
  );
}