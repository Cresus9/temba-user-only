import React, { useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GuestCheckoutForm from '../components/checkout/GuestCheckoutForm';
import CheckoutForm from '../components/checkout/CheckoutForm';
import AddonSelector from '../components/tickets/AddonSelector';
import FoodMenuSelector from '../components/food/FoodMenuSelector';
import PageSEO from '../components/SEO/PageSEO';
import { computeAddonsTotal, type AddonSelection } from '../services/addonService';
import { computeFoodTotal, type FoodSelection, type FoodMenuCategory } from '../services/foodMenuService';

interface CheckoutState {
  tickets: { [key: string]: number };
  totals: {
    subtotal: number;
    processingFee: number;
    total: number;
  };
  currency: string;
  eventId: string;
  eventDateId?: string | null;
  /** Pre-computed extras total passed from PermanentBookingPanel (addons + food) */
  addonTotal?: number;
  /** True when navigating from the permanent attraction booking panel */
  isPermanent?: boolean;
}

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isGuest, setIsGuest] = useState(!isAuthenticated);
  const [addonSelections, setAddonSelections] = useState<AddonSelection>({});
  const [foodSelections,  setFoodSelections]  = useState<FoodSelection>({});

  const state = location.state as CheckoutState;
  const hasValidState = Boolean(state?.tickets && state?.totals && state?.eventId);

  if (!hasValidState) return <Navigate to="/events" replace />;

  // When coming from PermanentBookingPanel, extras are already selected there.
  // Seed the amount from state so the total is correct from the first render.
  const isPermanent = Boolean((state as any).isPermanent);

  const handleGuestSuccess = (orderId: string) => {
    navigate(`/booking/confirmation/${orderId}`);
  };

  const handleAuthenticatedSuccess = (orderId: string) => {
    navigate(`/booking/confirmation/${orderId}`);
  };

  // Grand total = tickets + venue add-ons + food
  // For permanent events, seed from state.addonTotal (already chosen in the panel)
  const [addonsAmount, setAddonsAmount] = useState<number>((state as any).addonTotal ?? 0);
  const [foodAmount,   setFoodAmount]   = useState(0);

  const handleAddonChange = (next: AddonSelection, addons: import('../services/venueServiceService').VenueService[]) => {
    setAddonSelections(next);
    setAddonsAmount(computeAddonsTotal(next, addons));
  };

  const handleFoodChange = (next: FoodSelection, cats: FoodMenuCategory[]) => {
    setFoodSelections(next);
    setFoodAmount(computeFoodTotal(next, cats));
  };

  const extrasTotal = isPermanent
    ? addonsAmount               // seeded from state.addonTotal on mount
    : addonsAmount + foodAmount; // live selections on checkout page

  return (
    <div>
      <PageSEO title="Paiement" description="Finalisez votre achat de billets sur Temba." robots="noindex, nofollow" />

      {/* ── Title band ── */}
      <section className="bg-cream bg-grain border-b border-line">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-5 pb-6">
          <Link
            to={state?.eventId ? `/events/${state.eventId}` : '/events'}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-ink transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {state?.eventId ? "Retour à l'événement" : 'Retour aux événements'}
          </Link>

          <div className="flex items-center gap-3 mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute tabular-nums"
              style={{ fontFamily: mono }}
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

      {/* ── Main area ── */}
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 md:py-10 space-y-8">

          {/* ── Extras section ──
               For permanent attractions: selectors were already shown in the
               booking panel — show a read-only summary if extras were chosen.
               For regular events: show the live selectors here.              */}
          {isPermanent ? (
            (state as any).addonTotal > 0 && (
              <div className="px-4 py-3 bg-brand/8 rounded-xl border border-brand/20 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-brand">
                  Options &amp; repas inclus
                </p>
                <p className="text-[14px] font-extrabold text-brand tabular-nums" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                  +{new Intl.NumberFormat('fr-FR').format((state as any).addonTotal)} {state.currency}
                </p>
              </div>
            )
          ) : (
            <>
              {/* ── Add-ons (rendered if the event's venue has services) ── */}
              <AddonSelectorWrapper
                eventId={state.eventId}
                currency={state.currency}
                value={addonSelections}
                onChange={handleAddonChange}
              />

              {/* ── Food menu (rendered if the event has a food menu) ── */}
              <FoodMenuSelectorWrapper
                eventId={state.eventId}
                currency={state.currency}
                value={foodSelections}
                onChange={handleFoodChange}
              />
            </>
          )}

          {/* ── Divider when either section has selections ── */}
          {extrasTotal > 0 && <div className="border-t border-line" />}

          {/* ── Payment form ── */}
          {isGuest ? (
            <GuestCheckoutForm
              tickets={state.tickets}
              totalAmount={state.totals.total}
              addonTotal={extrasTotal}
              currency={state.currency}
              eventId={state.eventId}
              onSuccess={handleGuestSuccess}
            />
          ) : (
            <CheckoutForm
              tickets={state.tickets}
              totalAmount={state.totals.total}
              addonTotal={extrasTotal}
              currency={state.currency}
              eventId={state.eventId}
              eventDateId={state.eventDateId}
              onSuccess={handleAuthenticatedSuccess}
            />
          )}

          {!isAuthenticated && (
            <div className="pt-5 border-t border-line text-center">
              <p className="text-[13px] text-ink-mute">
                Vous avez déjà un compte ?{' '}
                <button
                  onClick={() =>
                    navigate('/login', {
                      state: { from: location.pathname, checkoutData: state },
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

// ── Thin wrapper that feeds the services list back to the parent ──────────────
import { useEffect, useRef } from 'react';
import { getServicesForEvent, type VenueService } from '../services/venueServiceService';

function AddonSelectorWrapper({
  eventId,
  currency,
  value,
  onChange,
}: {
  eventId: string;
  currency: string;
  value: AddonSelection;
  onChange: (next: AddonSelection, addons: VenueService[]) => void;
}) {
  const addonsRef = useRef<VenueService[]>([]);
  const [addons, setAddons] = useState<VenueService[]>([]);

  useEffect(() => {
    getServicesForEvent(eventId).then(data => {
      addonsRef.current = data;
      // Only show if at least one service is active (admin toggle via is_active)
      setAddons(data.filter(s => s.is_active !== false));
    });
  }, [eventId]);

  if (addons.length === 0) return null;

  return (
    <AddonSelector
      eventId={eventId}
      currency={currency}
      value={value}
      onChange={next => onChange(next, addonsRef.current)}
    />
  );
}

// ── FoodMenuSelectorWrapper ───────────────────────────────────────────────────
import { getMenuForEvent } from '../services/foodMenuService';

function FoodMenuSelectorWrapper({
  eventId,
  currency,
  value,
  onChange,
}: {
  eventId:  string;
  currency: string;
  value:    FoodSelection;
  onChange: (next: FoodSelection, cats: FoodMenuCategory[]) => void;
}) {
  const catsRef = useRef<FoodMenuCategory[]>([]);
  const [cats, setCats] = useState<FoodMenuCategory[]>([]);

  useEffect(() => {
    getMenuForEvent(eventId).then(data => {
      catsRef.current = data;
      // Only show if at least one item is available (admin toggle via is_available)
      const hasAvailable = data.some(cat => cat.items.some(i => i.is_available));
      setCats(hasAvailable ? data : []);
    });
  }, [eventId]);

  if (cats.length === 0) return null;

  return (
    <FoodMenuSelector
      eventId={eventId}
      currency={currency}
      value={value}
      onChange={(next, updatedCats) => {
        catsRef.current = updatedCats;
        onChange(next, catsRef.current);
      }}
    />
  );
}
