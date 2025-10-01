import React, { useState, useEffect } from 'react';
import { ShoppingCart, ChevronUp, ChevronDown, X, Ticket, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';

const CART_STORAGE_KEY = 'temba_cart_selections';

interface CartEvent {
  eventId: string;
  eventTitle: string;
  currency: string;
  items: Array<{
    ticketId: string;
    ticketName: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
}

interface GlobalFloatingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalFloatingCart({ isOpen, onClose }: GlobalFloatingCartProps) {
  const [cartEvents, setCartEvents] = useState<CartEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load cart data and fetch event details
  const loadCartData = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) {
        setCartEvents([]);
        return;
      }

      const cartState = JSON.parse(stored);
      const events: CartEvent[] = [];

      // For now, we'll create mock event data since we don't have event details readily available
      // In a real implementation, you'd fetch event and ticket details from the API
      for (const [eventId, tickets] of Object.entries(cartState)) {
        const ticketEntries = Object.entries(tickets as { [key: string]: number });
        const hasItems = ticketEntries.some(([, qty]) => qty > 0);
        
        if (hasItems) {
          // Mock event data - in real implementation, fetch from API
          const mockEvent: CartEvent = {
            eventId,
            eventTitle: `Événement ${eventId.slice(0, 8)}...`,
            currency: 'XOF',
            items: ticketEntries
              .filter(([, qty]) => qty > 0)
              .map(([ticketId, quantity]) => ({
                ticketId,
                ticketName: `Billet ${ticketId.slice(0, 8)}...`,
                quantity,
                price: 5000 // Mock price
              })),
            subtotal: 0
          };

          // Calculate subtotal
          mockEvent.subtotal = mockEvent.items.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0
          );

          events.push(mockEvent);
        }
      }

      setCartEvents(events);
    } catch (error) {
      console.error('Error loading global cart data:', error);
      setCartEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadCartData();
  }, [isOpen]);

  // Calculate totals
  const totalItems = cartEvents.reduce((sum, event) => 
    sum + event.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );
  const totalAmount = cartEvents.reduce((sum, event) => sum + event.subtotal, 0);

  // Handle navigation to specific event
  const handleGoToEvent = (eventId: string) => {
    navigate(`/events/${eventId}`);
    onClose();
  };

  // Handle clear all carts
  const handleClearAllCarts = () => {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
    setCartEvents([]);
    onClose();
  };

  // Handle quantity updates
  const updateCartQuantity = (eventId: string, ticketId: string, newQuantity: number) => {
    try {
      const cartData = localStorage.getItem(CART_STORAGE_KEY);
      if (!cartData) return;

      const cartState = JSON.parse(cartData);
      if (!cartState[eventId]) return;

      // Update quantity
      if (newQuantity <= 0) {
        delete cartState[eventId][ticketId];
      } else {
        cartState[eventId][ticketId] = newQuantity;
      }

      // Clean up empty events
      if (Object.keys(cartState[eventId]).length === 0) {
        delete cartState[eventId];
      }

      // Update storage
      if (Object.keys(cartState).length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
      }

      // Trigger update
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Reload cart data
      loadCartData();
      
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      toast.error('Erreur lors de la mise à jour du panier');
    }
  };

  // Handle direct checkout for specific event
  const handleCheckoutEvent = async (eventId: string) => {
    try {
      setLoading(true);
      
      // Get cart data for this event
      const cartData = localStorage.getItem(CART_STORAGE_KEY);
      if (!cartData) {
        toast.error('Panier vide');
        return;
      }
      
      const cartState = JSON.parse(cartData);
      const eventTickets = cartState[eventId];
      
      if (!eventTickets || Object.keys(eventTickets).length === 0) {
        toast.error('Aucun billet sélectionné pour cet événement');
        return;
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Veuillez vous connecter pour continuer');
        navigate('/login', { state: { from: `/events/${eventId}` } });
        onClose();
        return;
      }

      // Fetch event and ticket type data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (
            id,
            name,
            description,
            price,
            quantity,
            available,
            max_per_order,
            sales_enabled
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        console.error('Error fetching event:', eventError);
        toast.error('Erreur lors du chargement de l\'événement');
        return;
      }

      // Calculate totals using actual ticket type data
      const ticketTypes = eventData.ticket_types || [];
      let subtotal = 0;
      
      for (const [ticketId, quantity] of Object.entries(eventTickets)) {
        const ticketType = ticketTypes.find((t: any) => t.id === ticketId);
        if (ticketType && quantity > 0) {
          subtotal += ticketType.price * quantity;
        }
      }

      const processingFee = subtotal * 0.02; // 2% processing fee
      const total = subtotal + processingFee;

      const totals = {
        subtotal,
        processingFee,
        total
      };

      // Navigate directly to checkout
      navigate('/checkout', {
        state: {
          tickets: eventTickets,
          totals,
          currency: eventData.currency || 'XOF',
          eventId
        }
      });
      
      onClose();
      
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Erreur lors du checkout');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Cart Modal */}
      <div className="fixed top-16 right-4 z-50 max-w-md w-full mx-4 sm:mx-0">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-slide-down">
          {/* Header */}
          <div className="bg-indigo-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <h3 className="font-medium text-gray-900">
                  Panier Global ({totalItems} billet{totalItems > 1 ? 's' : ''})
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-indigo-100 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-indigo-600" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-indigo-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-indigo-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Chargement...</p>
              </div>
            ) : cartEvents.length === 0 ? (
              <div className="p-6 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Votre panier est vide</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Total Summary */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(totalAmount, 'XOF')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cartEvents.length} événement{cartEvents.length > 1 ? 's' : ''} • {totalItems} billet{totalItems > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Event Details */}
                {isExpanded && (
                  <div className="space-y-3">
                    {cartEvents.map((event) => (
                      <div key={event.eventId} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {event.eventTitle}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {event.items.length} type{event.items.length > 1 ? 's' : ''} de billet
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              {formatCurrency(event.subtotal, event.currency)}
                            </p>
                            <button
                              onClick={() => handleGoToEvent(event.eventId)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              Voir <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Ticket Items with Quantity Controls */}
                        <div className="space-y-2">
                          {event.items.map((item) => (
                            <div key={item.ticketId} className="flex items-center gap-3">
                              {/* Ticket Info - Limited width to prevent overflow */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 truncate" title={item.ticketName}>
                                  {item.ticketName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(item.price, event.currency)} chacun
                                </div>
                              </div>
                              
                              {/* Quantity Controls - Fixed width */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => updateCartQuantity(event.eventId, item.ticketId, Math.max(0, item.quantity - 1))}
                                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium"
                                  disabled={loading}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-xs font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(event.eventId, item.ticketId, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium"
                                  disabled={loading}
                                >
                                  +
                                </button>
                              </div>
                              
                              {/* Total Price - Fixed width */}
                              <div className="text-xs font-medium text-gray-900 flex-shrink-0 w-16 text-right">
                                {formatCurrency(item.price * item.quantity, event.currency)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Event Actions */}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleCheckoutEvent(event.eventId)}
                            disabled={loading}
                            className="flex-1 bg-indigo-600 text-white text-xs py-2 px-3 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                Chargement...
                              </>
                            ) : (
                              <>
                                <Ticket className="h-3 w-3" />
                                Commander
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Global Actions */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  {cartEvents.length > 1 && (
                    <button
                      onClick={() => navigate('/events')}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Voir tous les événements
                    </button>
                  )}
                  
                  <button
                    onClick={handleClearAllCarts}
                    className="w-full text-red-600 hover:text-red-700 text-sm transition-colors"
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
