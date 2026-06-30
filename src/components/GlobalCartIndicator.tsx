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
      className="relative w-9 h-9 rounded-lg border border-line bg-paper grid place-items-center text-ink hover:text-brand hover:border-brand/30 hover:bg-brand-50 transition-colors"
      title={`${cartSummary.totalItems} billet${cartSummary.totalItems > 1 ? 's' : ''} · ${cartSummary.totalEvents} événement${cartSummary.totalEvents > 1 ? 's' : ''}`}
    >
      <ShoppingCart className="w-4 h-4" />

      {/* Badge */}
      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center tabular-nums ring-2 ring-paper leading-none">
        {cartSummary.totalItems > 99 ? '99+' : cartSummary.totalItems}
      </span>
    </button>
  );
}

// Utility function to trigger cart update events
export function triggerCartUpdate() {
  window.dispatchEvent(new Event('cartUpdated'));
}
