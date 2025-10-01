import { useState, useEffect, useCallback } from 'react';

interface CartItem {
  ticketId: string;
  quantity: number;
  eventId: string;
  timestamp: number;
}

interface PersistentCartState {
  [eventId: string]: {
    [ticketId: string]: number;
  };
}

const CART_STORAGE_KEY = 'temba_cart_selections';
const CART_EXPIRY_HOURS = 24; // Cart expires after 24 hours

export function usePersistentCart(eventId: string, initialTickets: { [key: string]: number } = {}) {
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>(initialTickets);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsedCart: PersistentCartState = JSON.parse(stored);
        
        // Check if we have selections for this event
        if (parsedCart[eventId]) {
          // Check if cart is not expired
          const cartData = parsedCart[eventId];
          const hasValidSelections = Object.values(cartData).some(qty => qty > 0);
          
          if (hasValidSelections) {
            console.log('🛒 Restored cart for event:', eventId, cartData);
            setSelectedTickets(cartData);
            
            // Optional: Show toast notification about restored cart
            // Uncomment if you want users to know their cart was restored
            // const totalItems = Object.values(cartData).reduce((sum, qty) => sum + qty, 0);
            // if (totalItems > 0) {
            //   toast.success(`🛒 Panier restauré: ${totalItems} billet(s)`);
            // }
          }
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [eventId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      let cartState: PersistentCartState = {};
      
      if (stored) {
        cartState = JSON.parse(stored);
      }

      // Update the cart for this event
      cartState[eventId] = selectedTickets;

      // Clean up empty selections and expired carts
      Object.keys(cartState).forEach(eventKey => {
        const eventCart = cartState[eventKey];
        const hasSelections = Object.values(eventCart).some(qty => qty > 0);
        
        if (!hasSelections) {
          delete cartState[eventKey];
        }
      });

      // Save to localStorage
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
      
      // Trigger global cart update event
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Log for debugging
      const totalItems = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
      if (totalItems > 0) {
        console.log('💾 Saved cart for event:', eventId, selectedTickets);
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [selectedTickets, eventId]);

  // Clear cart for current event
  const clearCart = useCallback(() => {
    setSelectedTickets({});
    
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const cartState: PersistentCartState = JSON.parse(stored);
        delete cartState[eventId];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
        window.dispatchEvent(new Event('cartUpdated'));
        console.log('🗑️ Cleared cart for event:', eventId);
      }
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  }, [eventId]);

  // Clear all carts (useful for logout, etc.)
  const clearAllCarts = useCallback(() => {
    setSelectedTickets({});
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
    console.log('🗑️ Cleared all carts');
  }, []);

  // Get cart summary across all events
  const getCartSummary = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return { totalEvents: 0, totalItems: 0 };

      const cartState: PersistentCartState = JSON.parse(stored);
      const totalEvents = Object.keys(cartState).length;
      const totalItems = Object.values(cartState).reduce((sum, eventCart) => {
        return sum + Object.values(eventCart).reduce((eventSum, qty) => eventSum + qty, 0);
      }, 0);

      return { totalEvents, totalItems };
    } catch (error) {
      console.error('Error getting cart summary:', error);
      return { totalEvents: 0, totalItems: 0 };
    }
  }, []);

  // Update quantity for a specific ticket
  const updateQuantity = useCallback((ticketId: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: Math.max(0, quantity)
    }));
  }, []);

  // Check if cart has items
  const hasItems = Object.values(selectedTickets).some(qty => qty > 0);
  const totalItems = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);

  return {
    selectedTickets,
    setSelectedTickets,
    updateQuantity,
    clearCart,
    clearAllCarts,
    getCartSummary,
    hasItems,
    totalItems
  };
}

// Utility function to clean expired carts
export function cleanExpiredCarts() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return;

    const cartState: PersistentCartState = JSON.parse(stored);
    const now = Date.now();
    const expiryTime = CART_EXPIRY_HOURS * 60 * 60 * 1000;

    // For now, we don't have timestamps, so we'll implement this in the future
    // This is a placeholder for when we add timestamp tracking
    
    console.log('🧹 Cart cleanup completed');
  } catch (error) {
    console.error('Error cleaning expired carts:', error);
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}
