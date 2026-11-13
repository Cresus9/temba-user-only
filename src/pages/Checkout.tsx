import React, { useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CheckoutForm from '../components/checkout/CheckoutForm';
import AddonSelector from '../components/tickets/AddonSelector';
import FoodMenuSelector from '../components/food/FoodMenuSelector';
import PageSEO from '../components/SEO/PageSEO';
import { computeAddonsTotal, type AddonSelection } from '../services/addonService';
import { computeFoodTotal, type FoodSelection, type FoodMenuCategory } from '../services/foodMenuService';
import { guestRedirectForOrder } from '../services/guestTicketService';
import { eventPublicPath } from '../utils/eventPath';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/formatters';
import { shortPlace } from '../utils/eventGeo';

interface CheckoutState {
  tickets: { [key: string]: number };
  totals: {
    subtotal: number;
    processingFee: number;
    total: number;
  };
  currency: string;
  eventId: string;
  eventSlug?: string | null;
  eventDateId?: string | null;
  /** Pre-computed extras total passed from PermanentBookingPanel (addons + food) */
  addonTotal?: number;
  /** True when navigating from the permanent attraction booking panel */
  isPermanent?: boolean;
}

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const CHECKOUT_DRAFT_KEY = 'temba_checkout_draft';

function persistCheckoutDraft(data: CheckoutState) {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

function readCheckoutDraft(): CheckoutState | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.tickets && parsed?.totals && parsed?.eventId) return parsed as CheckoutState;
  } catch {
    /* ignore */
  }
  return null;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { events } = useEvents();
  const [addonSelections, setAddonSelections] = useState<AddonSelection>({});
  const [foodSelections,  setFoodSelections]  = useState<FoodSelection>({});

  const locationState = location.state as CheckoutState | null;
  const state =
    locationState?.tickets && locationState?.totals && locationState?.eventId
      ? locationState
      : readCheckoutDraft();

  if (!state) return <Navigate to="/events" replace />;

  persistCheckoutDraft(state);

  // When coming from PermanentBookingPanel, extras are already selected there.
  // Seed the amount from state so the total is correct from the first render.
  const isPermanent = Boolean((state as any).isPermanent);

  const handleGuestSuccess = (orderId: string) => {
    const guestPath = guestRedirectForOrder(orderId);
    navigate(guestPath || '/find-tickets');
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

      <section className="border-b border-line bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-4 px-5 md:px-10">
          <Link to="/" aria-label="Temba" className="mr-auto text-[15px] font-semibold">Paiement</Link>
          <ol className="hidden items-center gap-3 text-[14px] md:flex">
            {['Billets', 'Coordonnées', 'Paiement', 'Billets reçus'].map((label, index) => (
              <li key={label} className="flex items-center gap-3">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${index <= 2 ? 'bg-brand text-white' : 'border border-line text-ink-3'}`}>{index < 2 ? '✓' : index + 1}</span>
                <span className={index === 2 ? 'font-semibold' : 'text-ink-3'}>{label}</span>
                {index < 3 && <span className="h-px w-8 bg-line" />}
              </li>
            ))}
          </ol>
          <span className="ml-auto hidden items-center gap-1.5 text-[14px] text-[#0B7A52] md:inline-flex">
            <Lock className="h-4 w-4" /> Paiement sécurisé
          </span>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-10">
          <div className="space-y-6">
          <Link
            to={state?.eventId ? eventPublicPath({ id: state.eventId, slug: state.eventSlug }) : '/events'}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux billets
          </Link>
          <h1 className="font-display text-[32px] font-bold tracking-tight">Paiement</h1>
          <p className="text-[14px] text-ink-3">Orange Money, Moov Money ou carte. Le code USSD Orange s'affiche ici dès que l'opérateur le demande — aucun débit sans votre validation.</p>

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
          <CheckoutForm
            tickets={state.tickets}
            totalAmount={state.totals.total}
            addonTotal={extrasTotal}
            currency={state.currency}
            eventId={state.eventId}
            eventDateId={state.eventDateId}
            onCreateAccount={() => {
              persistCheckoutDraft(state);
              navigate('/signup', {
                state: { redirectTo: '/checkout', checkoutData: state },
              });
            }}
            onSuccess={isAuthenticated ? handleAuthenticatedSuccess : handleGuestSuccess}
          />
          </div>
          <aside className="h-fit rounded-xl border border-line p-5 lg:sticky lg:top-6">
            <div className="flex gap-3">
              {events.find((item) => item.id === state.eventId)?.image_url ? (
                <img src={events.find((item) => item.id === state.eventId)?.image_url} alt="" className="h-20 w-16 rounded-lg object-cover" />
              ) : null}
              <div>
                <p className="font-display text-[16px] font-bold leading-snug">{events.find((item) => item.id === state.eventId)?.title || 'Votre commande'}</p>
                <p className="mt-1 text-[13.5px] text-ink-3">{shortPlace(events.find((item) => item.id === state.eventId)?.location, events.find((item) => item.id === state.eventId)?.city).label}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4 font-display text-[20px] font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency((state.totals?.total || 0) + extrasTotal, state.currency)}</span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[13px] text-ink-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Un souci au paiement ? WhatsApp +226 74 75 08 15, 7j/7.
            </p>
          </aside>
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
