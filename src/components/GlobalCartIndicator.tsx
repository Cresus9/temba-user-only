import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';

const CART_STORAGE_KEY = 'temba_cart_selections';

interface CartSummary {
  totalEvents: number;
  totalItems: number;
  events: Array<{
    eventId: string;
    itemCount: number;
  }>;
}

interface GlobalCartIndicatorProps {
  onClick?: () => void;
}

export default function GlobalCartIndicator({ onClick }: GlobalCartIndicatorProps) {
  const [cartSummary, setCartSummary] = useState<CartSummary>({ totalEvents: 0, totalItems: 0, events: [] });

  // Function to calculate cart summary
  const calculateCartSummary = (): CartSummary => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return { totalEvents: 0, totalItems: 0, events: [] };

      const cartState = JSON.parse(stored);
      const events: Array<{ eventId: string; itemCount: number }> = [];
      let totalItems = 0;

      Object.keys(cartState).forEach(eventId => {
        const eventCart = cartState[eventId];
        const itemCount = Object.values(eventCart).reduce((sum: number, qty: any) => sum + qty, 0);
        
        if (itemCount > 0) {
          events.push({ eventId, itemCount });
          totalItems += itemCount;
        }
      });

      return {
        totalEvents: events.length,
        totalItems,
        events
      };
    } catch (error) {
      console.error('Error calculating cart summary:', error);
      return { totalEvents: 0, totalItems: 0, events: [] };
    }
  };

  // Update cart summary on mount and when storage changes
  useEffect(() => {
    const updateSummary = () => {
      setCartSummary(calculateCartSummary());
    };

    // Initial load
    updateSummary();

    // Listen for storage changes (from other tabs/components)
    window.addEventListener('storage', updateSummary);
    
    // Listen for custom cart update events
    window.addEventListener('cartUpdated', updateSummary);

    // Periodic update to catch changes from same tab
    const interval = setInterval(updateSummary, 1000);

    return () => {
      window.removeEventListener('storage', updateSummary);
      window.removeEventListener('cartUpdated', updateSummary);
      clearInterval(interval);
    };
  }, []);

  // Handle click - open floating cart
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Don't show if no items
  if (cartSummary.totalItems === 0) return null;

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors duration-200"
      title={`${cartSummary.totalItems} billet(s) dans ${cartSummary.totalEvents} événement(s)`}
    >
      <ShoppingCart className="h-6 w-6" />
      
      {/* Badge */}
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
        {cartSummary.totalItems > 99 ? '99+' : cartSummary.totalItems}
      </span>

      {/* Tooltip for multiple events */}
      {cartSummary.totalEvents > 1 && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {cartSummary.totalEvents} événements
        </div>
      )}
    </button>
  );
}

// Utility function to trigger cart update events
export function triggerCartUpdate() {
  window.dispatchEvent(new Event('cartUpdated'));
}
