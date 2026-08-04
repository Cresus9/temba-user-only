import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { TicketType } from '../../types/event';
import TicketTypeCard from './TicketTypeCard';
import FloatingCartSummary from './FloatingCartSummary';
import { useAuth } from '../../context/AuthContext';
import { usePersistentCart } from '../../hooks/usePersistentCart';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';

interface EventDate {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  status: string;
  tickets_sold?: number;
}

interface BookingFormProps {
  eventId: string;
  ticketTypes: TicketType[];
  currency: string;
  onReviewOpen?: () => void;
  onReviewClose?: () => void;
}

export default function BookingForm({ 
  eventId, 
  ticketTypes, 
  currency,
  onReviewOpen,
  onReviewClose
}: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventDates, setEventDates] = useState<EventDate[]>([]);
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use persistent cart hook
  const {
    selectedTickets,
    updateQuantity,
    clearCart,
    hasItems,
    totalItems
  } = usePersistentCart(
    eventId,
    ticketTypes.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
  );

  // Fetch event dates on mount
  useEffect(() => {
    const fetchEventDates = async () => {
      try {
        setLoadingDates(true);
        console.log('🔍 Fetching event dates for event:', eventId);
        
        // Fetch active dates from event_dates, ordered by date
        let { data, error } = await supabase
          .from('event_dates')
          .select('id, date, start_time, end_time, capacity, status')
          .eq('event_id', eventId)
          .order('date', { ascending: true });

        if (error) throw error;

        // Filter active client-side (status can be 'active' or 'ACTIVE')
        const activeDates = (data || []).filter(d => d.status?.toLowerCase() === 'active');
        const finalDates = activeDates.length > 0 ? activeDates : (data || []);

        if (finalDates.length > 0) {
          setEventDates(finalDates);
          if (!selectedDateId) {
            setSelectedDateId(finalDates[0].id);
          }
        } else {
          // no dates — void
          setEventDates([]);
        }
      } catch (error: any) {
        console.error('❌ Error fetching event dates:', error);
        toast.error('Erreur lors du chargement des dates');
        setEventDates([]);
      } finally {
        setLoadingDates(false);
      }
    };

    fetchEventDates();
  }, [eventId]);

  const isPaused = (t: TicketType) => t.sales_enabled === false || t.is_paused === true || t.on_sale === false || t.is_active === false || t.status === 'PAUSED';

  // Reset any quantities for paused tickets whenever types change
  React.useEffect(() => {
    let shouldUpdate = false;
    for (const t of ticketTypes) {
      if (isPaused(t) && (selectedTickets[t.id] || 0) > 0) {
        updateQuantity(t.id, 0);
        shouldUpdate = true;
      }
    }
    if (shouldUpdate) {
      toast.error('Certaines catégories de billets ont été suspendues et ont été retirées du panier.');
    }
  }, [ticketTypes, selectedTickets, updateQuantity]);

  const handleQuantityChange = (ticketId: string, quantity: number) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket) return;

    if (isPaused(ticket)) {
      toast.error('La vente de ce billet est suspendue.');
      return;
    }

    if (quantity > ticket.max_per_order) {
      toast.error(`Maximum ${ticket.max_per_order} billets autorisés par commande`);
      return;
    }

    if (quantity > ticket.available) {
      toast.error(`Seulement ${ticket.available} billets disponibles`);
      return;
    }

    updateQuantity(ticketId, quantity);
    setError('');
  };

  const calculateTotals = () => {
    const subtotal = ticketTypes.reduce((total, ticket) => {
      if (isPaused(ticket)) return total;
      return total + (ticket.price * (selectedTickets[ticket.id] || 0));
    }, 0);
    const processingFee = subtotal * 0.02; // 2% processing fee
    return {
      subtotal,
      processingFee,
      total: subtotal + processingFee
    };
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // Remove any paused tickets from selection
    let hadPaused = false;
    for (const t of ticketTypes) {
      if (isPaused(t) && (selectedTickets[t.id] || 0) > 0) {
        updateQuantity(t.id, 0);
        hadPaused = true;
      }
    }

    if (hadPaused) {
      toast.error('Certaines catégories de billets ont été suspendues et ont été retirées du panier.');
      return; // Return early to let user see the updated cart
    }

    // Validate at least one active ticket is selected
    const hasTickets = ticketTypes.some(t => !isPaused(t) && (selectedTickets[t.id] || 0) > 0);
    if (!hasTickets) {
      toast.error('Veuillez sélectionner au moins un billet');
      return;
    }

    // Validate date selection for multi-date events
    if (eventDates.length > 1 && !selectedDateId) {
      toast.error('Veuillez sélectionner une date pour cet événement');
      return;
    }

    const totals = calculateTotals();
    
    // Navigate to checkout with order details
    navigate('/checkout', {
      state: {
        tickets: selectedTickets,
        totals,
        currency,
        eventId,
        eventDateId: selectedDateId // Pass selected date ID
      }
    });
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('Panier vidé');
  };

  const availableTickets = ticketTypes.filter(ticket => 
    ticket.available > 0 && !isPaused(ticket)
  );

  if (availableTickets.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-[15px] font-bold text-ink mb-1">Aucun billet disponible</p>
        <p className="text-[13px] text-ink-mute">
          Les billets ne sont pas disponibles pour le moment. Revenez plus tard ou contactez l'organisateur.
        </p>
      </div>
    );
  }

  // Format date for display — parse as local date to avoid UTC-midnight timezone shift
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-[13px] text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Date Selection - Integrated into booking flow */}
        {loadingDates ? (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-cream rounded-xl border border-line">
            <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin flex-shrink-0" />
            <span className="text-[13px] text-ink-mute">Chargement des dates…</span>
          </div>
        ) : eventDates.length > 0 ? (
          <div className="space-y-3">
            {eventDates.length > 1 && (
              <p className="eyebrow">
                {eventDates.length > 1 ? 'Choisissez une date' : 'Date de l\'événement'}
              </p>
            )}

            {eventDates.length > 1 ? (
              <div className="flex flex-col gap-2">
                {eventDates.map((eventDate) => {
                  const statusLower = eventDate.status?.toLowerCase() || '';
                  const isSoldOut = statusLower === 'sold_out' ||
                    (eventDate.capacity != null && eventDate.tickets_sold !== undefined &&
                     eventDate.tickets_sold >= eventDate.capacity);
                  const isDisabled = isSoldOut || statusLower === 'cancelled';
                  const isSelected = selectedDateId === eventDate.id;

                  return (
                    <button
                      key={eventDate.id}
                      type="button"
                      onClick={() => !isDisabled && setSelectedDateId(eventDate.id)}
                      disabled={isDisabled}
                      className={`relative w-full p-3.5 rounded-xl border text-left transition-all ${
                        isDisabled
                          ? 'border-line bg-cream opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-brand/40 bg-brand/5 shadow-sm'
                          : 'border-line bg-paper hover:border-brand/30 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-brand/10' : 'bg-cream'
                        }`}>
                          <Calendar className={`h-4 w-4 ${isSelected ? 'text-brand' : 'text-ink-mute'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-bold leading-tight capitalize ${
                            isSelected ? 'text-brand' : 'text-ink'
                          }`}>
                            {formatDate(eventDate.date)}
                          </p>
                          <p className="flex items-center gap-1.5 text-[11px] text-ink-mute mt-0.5">
                            <Clock className="h-3 w-3" />
                            {eventDate.start_time}
                            {eventDate.end_time && ` – ${eventDate.end_time}`}
                          </p>
                        </div>
                        {isSoldOut && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold uppercase tracking-wide">
                            Complet
                          </span>
                        )}
                        {isSelected && !isSoldOut && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand grid place-items-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-cream rounded-xl border border-line">
                <Calendar className="h-4 w-4 text-brand flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-ink capitalize">
                    {formatDate(eventDates[0].date)}
                  </p>
                  <p className="text-[11px] text-ink-mute mt-0.5">
                    {eventDates[0].start_time}
                    {eventDates[0].end_time && ` – ${eventDates[0].end_time}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          !loadingDates && (
            <div className="px-4 py-3 bg-cream rounded-xl border border-line">
              <p className="text-[12px] text-ink-mute">Aucune date configurée pour cet événement.</p>
            </div>
          )
        )}

        {/* Step 2: Ticket Selection */}
        <div className="space-y-3">
          {eventDates.length > 1 && (
            <p className="eyebrow">Sélectionnez vos billets</p>
          )}
          {ticketTypes.map((ticket) => (
            <TicketTypeCard
              key={ticket.id}
              ticket={ticket}
              quantity={selectedTickets[ticket.id] || 0}
              currency={currency}
              onQuantityChange={(quantity) => handleQuantityChange(ticket.id, quantity)}
            />
          ))}
        </div>
      </div>

      {/* Floating Cart Summary */}
      <FloatingCartSummary
        selectedTickets={selectedTickets}
        ticketTypes={ticketTypes}
        currency={currency}
        eventId={eventId}
        selectedDateId={selectedDateId}
        eventDates={eventDates}
        onQuantityChange={handleQuantityChange}
        onProceedToCheckout={handleProceedToCheckout}
        onClearCart={handleClearCart}
      />
    </>
  );
}