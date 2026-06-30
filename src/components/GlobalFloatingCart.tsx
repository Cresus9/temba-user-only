import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Ticket, ExternalLink, Loader } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';

const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

const CART_STORAGE_KEY = 'temba_cart_selections';

interface CartItem {
  ticketId: string;
  ticketName: string;
  quantity: number;
  price: number;
}

interface CartEvent {
  eventId: string;
  eventTitle: string;
  currency: string;
  items: CartItem[];
  subtotal: number;
}

interface GlobalFloatingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalFloatingCart({ isOpen, onClose }: GlobalFloatingCartProps) {
  const [cartEvents, setCartEvents] = useState<CartEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading]       = useState(false);
  const navigate                    = useNavigate();

  const loadCartData = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) { setCartEvents([]); return; }

      const cartState = JSON.parse(stored);
      const events: CartEvent[] = [];

      for (const [eventId, tickets] of Object.entries(cartState)) {
        const ticketEntries = Object.entries(tickets as Record<string, number>);
        const hasItems = ticketEntries.some(([, qty]) => qty > 0);
        if (!hasItems) continue;

        const mockEvent: CartEvent = {
          eventId,
          eventTitle: `Événement ${eventId.slice(0, 8)}…`,
          currency: 'XOF',
          items: ticketEntries
            .filter(([, qty]) => qty > 0)
            .map(([ticketId, quantity]) => ({
              ticketId,
              ticketName: `Billet ${ticketId.slice(0, 8)}…`,
              quantity,
              price: 5000,
            })),
          subtotal: 0,
        };
        mockEvent.subtotal = mockEvent.items.reduce(
          (s, i) => s + i.price * i.quantity,
          0
        );
        events.push(mockEvent);
      }

      setCartEvents(events);
    } catch (err) {
      console.error('Error loading cart:', err);
      setCartEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadCartData();
  }, [isOpen]);

  const totalItems  = cartEvents.reduce((s, e) => s + e.items.reduce((si, i) => si + i.quantity, 0), 0);
  const totalAmount = cartEvents.reduce((s, e) => s + e.subtotal, 0);

  const handleGoToEvent = (eventId: string) => {
    navigate(`/events/${eventId}`);
    onClose();
  };

  const handleClearAll = () => {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
    setCartEvents([]);
    onClose();
  };

  const updateQty = (eventId: string, ticketId: string, qty: number) => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state[eventId]) return;

      if (qty <= 0) delete state[eventId][ticketId];
      else          state[eventId][ticketId] = qty;

      if (Object.keys(state[eventId]).length === 0) delete state[eventId];
      if (Object.keys(state).length === 0) localStorage.removeItem(CART_STORAGE_KEY);
      else localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));

      window.dispatchEvent(new Event('cartUpdated'));
      loadCartData();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du panier');
    }
  };

  const handleCheckout = async (eventId: string) => {
    try {
      setLoading(true);
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) { toast.error('Panier vide'); return; }

      const cartState  = JSON.parse(raw);
      const eventTix   = cartState[eventId];
      if (!eventTix || Object.keys(eventTix).length === 0) {
        toast.error('Aucun billet sélectionné');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Veuillez vous connecter pour continuer');
        navigate('/login', { state: { from: `/events/${eventId}` } });
        onClose();
        return;
      }

      const { data: eventData, error } = await supabase
        .from('events')
        .select('*, ticket_types(id, name, price, quantity, available, max_per_order, sales_enabled)')
        .eq('id', eventId)
        .single();

      if (error || !eventData) {
        toast.error("Erreur lors du chargement de l'événement");
        return;
      }

      const tTypes = eventData.ticket_types || [];
      let subtotal = 0;
      for (const [tid, qty] of Object.entries(eventTix)) {
        const tt = tTypes.find((t: any) => t.id === tid);
        if (tt && Number(qty) > 0) subtotal += tt.price * Number(qty);
      }

      navigate('/checkout', {
        state: {
          tickets: eventTix,
          totals: { subtotal, processingFee: subtotal * 0.02, total: subtotal * 1.02 },
          currency: eventData.currency || 'XOF',
          eventId,
        },
      });
      onClose();
    } catch (err) {
      toast.error('Erreur lors du checkout');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-16 right-4 z-50 w-[min(100vw-2rem,380px)]">
        <div className="bg-paper rounded-2xl border border-line shadow-pop overflow-hidden">

          {/* ── Header */}
          <div className="bg-cream border-b border-line px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand grid place-items-center flex-shrink-0">
                <ShoppingCart className="w-4 h-4 text-paper" />
              </div>
              <div>
                <p
                  className="text-[13px] font-bold text-ink leading-tight"
                  style={{ fontFamily: display }}
                >
                  Panier
                </p>
                <p className="text-[10px] text-ink-mute" style={{ fontFamily: mono }}>
                  {totalItems} billet{totalItems > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(e => !e)}
                className="w-7 h-7 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-ink hover:bg-cream transition-colors text-[15px] font-bold"
                aria-label={isExpanded ? 'Réduire' : 'Développer'}
              >
                {isExpanded ? '−' : '+'}
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-ink hover:bg-cream transition-colors"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2.5">
                <Loader className="w-6 h-6 text-brand animate-spin" />
                <p className="text-[12px] text-ink-mute">Chargement…</p>
              </div>
            ) : cartEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-cream border border-line grid place-items-center">
                  <ShoppingCart className="w-6 h-6 text-ink-mute" />
                </div>
                <p className="text-[13px] text-ink-mute">Votre panier est vide</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">

                {/* Total summary */}
                <div className="flex items-baseline justify-between p-3 bg-cream rounded-xl border border-line">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute" style={{ fontFamily: mono }}>
                      Total
                    </p>
                    <p className="text-[18px] font-bold text-ink tabular-nums" style={{ fontFamily: display }}>
                      {formatCurrency(totalAmount, 'XOF')}
                    </p>
                  </div>
                  <p className="text-[11px] text-ink-mute">
                    {cartEvents.length} événement{cartEvents.length > 1 ? 's' : ''} · {totalItems} billet{totalItems > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Event cards */}
                {isExpanded && (
                  <div className="space-y-3">
                    {cartEvents.map(event => (
                      <div key={event.eventId} className="rounded-xl border border-line bg-paper overflow-hidden">
                        {/* Event header */}
                        <div className="flex items-center justify-between px-3 py-2.5 bg-cream border-b border-line">
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[12px] font-bold text-ink truncate"
                              style={{ fontFamily: display }}
                            >
                              {event.eventTitle}
                            </p>
                            <p className="text-[10px] text-ink-mute">
                              {event.items.length} type{event.items.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span className="text-[12px] font-bold text-ink tabular-nums">
                              {formatCurrency(event.subtotal, event.currency)}
                            </span>
                            <button
                              onClick={() => handleGoToEvent(event.eventId)}
                              className="w-6 h-6 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-brand hover:border-brand/30 transition-colors"
                              title="Voir l'événement"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Ticket rows */}
                        <div className="px-3 py-2.5 space-y-2.5">
                          {event.items.map(item => (
                            <div key={item.ticketId} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-ink truncate">
                                  {item.ticketName}
                                </p>
                                <p className="text-[10px] text-ink-mute tabular-nums">
                                  {formatCurrency(item.price, event.currency)}
                                </p>
                              </div>

                              {/* Stepper */}
                              <div className="flex items-center gap-1 bg-cream border border-line rounded-lg px-1 py-0.5 flex-shrink-0">
                                <button
                                  onClick={() => updateQty(event.eventId, item.ticketId, item.quantity - 1)}
                                  disabled={loading}
                                  className="w-6 h-6 rounded grid place-items-center text-brand font-bold text-[14px] hover:bg-brand-50 transition-colors disabled:opacity-40"
                                >
                                  −
                                </button>
                                <span
                                  className="w-5 text-center text-[11px] font-bold tabular-nums"
                                  style={{ fontFamily: mono }}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQty(event.eventId, item.ticketId, item.quantity + 1)}
                                  disabled={loading}
                                  className="w-6 h-6 rounded grid place-items-center text-brand font-bold text-[14px] hover:bg-brand-50 transition-colors disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>

                              <span
                                className="text-[11px] font-bold text-ink tabular-nums w-16 text-right flex-shrink-0"
                                style={{ fontFamily: mono }}
                              >
                                {formatCurrency(item.price * item.quantity, event.currency)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Checkout CTA per event */}
                        <div className="px-3 pb-3">
                          <button
                            onClick={() => handleCheckout(event.eventId)}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-paper text-[12px] font-bold hover:bg-brand/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading
                              ? <Loader className="w-4 h-4 animate-spin" />
                              : <Ticket className="w-4 h-4" />}
                            {loading ? 'Chargement…' : 'Commander'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Global actions */}
                <div className="pt-1 border-t border-line space-y-2">
                  {cartEvents.length > 1 && (
                    <button
                      onClick={() => navigate('/events')}
                      className="w-full py-2.5 rounded-xl border border-line text-[12px] font-semibold text-ink hover:bg-cream transition-colors"
                    >
                      Voir tous les événements
                    </button>
                  )}
                  <button
                    onClick={handleClearAll}
                    className="w-full text-[11px] text-red-500 hover:text-red-600 transition-colors py-1"
                  >
                    Vider tout le panier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
