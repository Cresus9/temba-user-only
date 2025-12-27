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
        
        // Try event_dates first (organizer app uses this table)
        // Status can be 'active' (lowercase) or 'ACTIVE' (uppercase)
        let { data, error } = await supabase
          .from('event_dates')
          .select('*')
          .eq('event_id', eventId)
          .ilike('status', 'active')  // Case-insensitive match for 'active' or 'ACTIVE'
          .order('date', { ascending: true })
          .order('display_order', { ascending: true });

        // If that fails, try event_dates_times (migration table)
        if (error || !data || data.length === 0) {
          console.warn('⚠️ No dates found in event_dates, trying event_dates_times...');
          const { data: altData, error: altError } = await supabase
            .from('event_dates_times')
            .select('*')
            .eq('event_id', eventId)
            .ilike('status', 'active')  // Case-insensitive match
            .order('date', { ascending: true })
            .order('display_order', { ascending: true });
          
          if (!altError && altData && altData.length > 0) {
            console.log('✅ Found dates in event_dates_times table:', altData);
            data = altData;
            error = null;
          } else if (altError) {
            console.warn('⚠️ event_dates_times table also failed:', altError);
          }
        }

        // If still no data, try without status filter (for debugging)
        if (error || !data || data.length === 0) {
          console.warn('⚠️ No dates found with active status, trying without status filter...');
          const { data: allData, error: allError } = await supabase
            .from('event_dates')
            .select('*')
            .eq('event_id', eventId)
            .order('date', { ascending: true });
          
          if (allError) {
            // Try event_dates_times as fallback
            const { data: allDataAlt, error: allErrorAlt } = await supabase
              .from('event_dates_times')
              .select('*')
              .eq('event_id', eventId)
              .order('date', { ascending: true });
            
            if (allErrorAlt) {
              console.error('❌ Error fetching all event dates:', allErrorAlt);
              throw allErrorAlt;
            }
            
            console.log('📅 All dates from event_dates_times (any status):', allDataAlt);
            data = allDataAlt;
          } else {
            console.log('📅 All dates from event_dates (any status):', allData);
            data = allData;
          }
          
          // Filter client-side for active status (case-insensitive)
          if (data && data.length > 0) {
            const activeDates = data.filter(d => 
              d.status && d.status.toLowerCase() === 'active'
            );
            console.log(`✅ Found ${data.length} total dates, ${activeDates.length} active:`, activeDates);
            data = activeDates;
          }
        }

        if (error) {
          console.error('❌ Error fetching event dates:', error);
          // Check if it's an RLS issue
          if (error.code === 'PGRST301' || error.message.includes('permission')) {
            console.warn('⚠️ RLS might be blocking event dates. Check policies.');
            toast.error('Impossible de charger les dates. Vérifiez les permissions.');
          }
        }

        console.log('✅ Final event dates:', data); // Debug log
        console.log(`📊 Found ${data?.length || 0} date(s) for event ${eventId}`);

        if (data && data.length > 0) {
          // Log each date for debugging
          data.forEach((date, idx) => {
            console.log(`  Date ${idx + 1}: ${date.date} at ${date.start_time} (status: ${date.status}, id: ${date.id})`);
          });
          
          setEventDates(data);
          // Auto-select first date (for both single and multiple dates)
          if (!selectedDateId) {
            setSelectedDateId(data[0].id);
            console.log('✅ Auto-selected date:', data[0].id);
          }
        } else {
          console.log('ℹ️ No event dates found for event:', eventId);
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
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun billet disponible</h3>
        <p className="text-gray-600">
          Les billets ne sont actuellement pas disponibles pour cet événement.
          Revenez plus tard ou contactez l'organisateur pour plus d'informations.
        </p>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Date Selection - Integrated into booking flow */}
        {loadingDates ? (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-center gap-3 text-indigo-700">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              <span className="text-sm font-medium">Chargement des dates disponibles...</span>
            </div>
          </div>
        ) : eventDates.length > 0 ? (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {eventDates.length > 1 ? 'Choisissez votre date' : 'Date de l\'événement'}
              </h3>
            </div>
            
            {eventDates.length > 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eventDates.map((eventDate) => {
                  const statusLower = eventDate.status?.toLowerCase() || '';
                  const isSoldOut = statusLower === 'sold_out' || 
                    (eventDate.capacity && eventDate.tickets_sold !== undefined && 
                     eventDate.tickets_sold >= eventDate.capacity);
                  const isDisabled = isSoldOut || statusLower === 'cancelled';
                  
                  return (
                    <button
                      key={eventDate.id}
                      type="button"
                      onClick={() => !isDisabled && setSelectedDateId(eventDate.id)}
                      disabled={isDisabled}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                        isDisabled
                          ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          : selectedDateId === eventDate.id
                          ? 'border-indigo-600 bg-white shadow-lg ring-2 ring-indigo-200'
                          : 'border-gray-300 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {selectedDateId === eventDate.id && (
                        <div className="absolute top-2 right-2">
                          <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            selectedDateId === eventDate.id 
                              ? 'bg-indigo-100' 
                              : 'bg-gray-100'
                          }`}>
                            <Calendar className={`h-6 w-6 ${
                              selectedDateId === eventDate.id 
                                ? 'text-indigo-600' 
                                : 'text-gray-600'
                            }`} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 mb-1">
                            {formatDate(eventDate.date)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {eventDate.start_time}
                              {eventDate.end_time && ` - ${eventDate.end_time}`}
                            </span>
                          </div>
                          {eventDate.capacity && eventDate.tickets_sold !== undefined && (
                            <div className="text-xs text-gray-500">
                              {eventDate.tickets_sold} / {eventDate.capacity} billets vendus
                            </div>
                          )}
                          {isSoldOut && (
                            <div className="inline-flex items-center px-2 py-1 mt-2 bg-red-100 text-red-700 text-xs font-medium rounded">
                              Complet
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-indigo-200">
                <Calendar className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">
                    {formatDate(eventDates[0].date)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {eventDates[0].start_time}
                    {eventDates[0].end_time && ` - ${eventDates[0].end_time}`}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Debug: Show if we're not loading and have no dates
          !loadingDates && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              <p>ℹ️ Aucune date configurée pour cet événement</p>
              <p className="text-xs mt-1">Event ID: {eventId}</p>
            </div>
          )
        )}

        {/* Step 2: Ticket Selection */}
        <div className="space-y-4">
          {eventDates.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-sm">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sélectionnez vos billets
              </h3>
            </div>
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