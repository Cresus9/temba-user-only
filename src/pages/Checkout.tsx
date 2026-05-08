import React, { useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
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
  eventDateId?: string | null; // Optional: for multi-date events
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
    <div>
      {/* — — — Title band (cream) — — — */}
      <section className="bg-cream bg-grain border-b border-line">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-5 pb-6">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-ink transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux événements
          </Link>

          <div className="flex items-center gap-3 mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              Étape 2 / 3
            </span>
            <span aria-hidden className="w-px h-3 bg-line" />
            <span className="eyebrow !mb-0">Paiement</span>
          </div>

          <h1 className="!text-[clamp(22px,3vw,32px)] !leading-[1.06] text-ink mb-1.5 tracking-tight">
            Finaliser votre achat
          </h1>
          <p className="text-[13px] text-ink-mute">
            Choisissez votre méthode de paiement pour sécuriser vos billets.
          </p>

          {/* Trust strip */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-mute">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-brand" />
              Connexion chiffrée
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-accent" />
              Paiement sécurisé en FCFA
            </span>
          </div>
        </div>
      </section>

      {/* — — — Form area — — — */}
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 md:py-10">
          {isGuest ? (
            <GuestCheckoutForm
              tickets={state.tickets}
              totalAmount={state.totals.total}
              currency={state.currency}
              eventId={state.eventId}
              eventDateId={state.eventDateId}
              onSuccess={handleGuestSuccess}
            />
          ) : (
            <CheckoutForm
              tickets={state.tickets}
              totalAmount={state.totals.total}
              currency={state.currency}
              eventId={state.eventId}
              eventDateId={state.eventDateId}
              onSuccess={handleAuthenticatedSuccess}
            />
          )}

          {!isAuthenticated && (
            <div className="mt-6 pt-5 border-t border-line text-center">
              <p className="text-[13px] text-ink-mute">
                Vous avez déjà un compte ?{' '}
                <button
                  onClick={() =>
                    navigate('/login', {
                      state: {
                        from: location.pathname,
                        checkoutData: state,
                      },
                    })
                  }
                  className="font-semibold text-brand hover:text-brand-700 transition-colors"
                >
                  Se connecter
                </button>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
