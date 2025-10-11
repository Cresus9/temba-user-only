import React, { useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GuestCheckoutForm from '../components/checkout/GuestCheckoutForm';
import CheckoutForm from '../components/checkout/CheckoutForm';

interface CheckoutState {
  tickets: { [key: string]: number };
  totals: {
    subtotal: number;
    processingFee: number;
    total: number;
  };
  currency: string;
  eventId: string;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isGuest, setIsGuest] = useState(!isAuthenticated);
  
  // Get state from location
  const state = location.state as CheckoutState;

  const hasValidState = Boolean(state?.tickets && state?.totals && state?.eventId);

  // Redirect to events if no state (render Navigate to avoid setState during render warning)
  if (!hasValidState) {
    return <Navigate to="/events" replace />;
  }

  const handleGuestSuccess = async (orderId: string, verificationToken: string) => {
    // Redirect to verification notice page
    navigate(`/verify-order/${verificationToken}`);
  };

  const handleAuthenticatedSuccess = async (orderId: string) => {
    // Redirect to confirmation page
    navigate(`/booking/confirmation/${orderId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        to="/events"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="h-5 w-5" />
        Retour aux événements
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Finaliser votre achat
        </h1>
        <p className="text-gray-600">
          Choisissez votre méthode de paiement pour sécuriser vos billets
        </p>
      </div>

      {/* Checkout Form */}
      {isGuest ? (
        <GuestCheckoutForm
          tickets={state.tickets}
          totalAmount={state.totals.total}
          currency={state.currency}
          eventId={state.eventId}
          onSuccess={handleGuestSuccess}
        />
      ) : (
        <CheckoutForm
          tickets={state.tickets}
          totalAmount={state.totals.total}
          currency={state.currency}
          eventId={state.eventId}
          onSuccess={handleAuthenticatedSuccess}
        />
      )}

      {/* Switch between guest and authenticated checkout */}
      {!isAuthenticated && (
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Vous avez déjà un compte ?{' '}
            <button
              onClick={() => navigate('/login', { 
                state: { 
                  from: location.pathname,
                  checkoutData: state 
                }
              })}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Se connecter
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
