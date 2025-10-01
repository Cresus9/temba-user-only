const CART_STORAGE_KEY = 'temba_cart_selections';

/**
 * Clear cart for a specific event
 * @param eventId - The event ID to clear from cart
 * @param source - Source of the clearing for debugging
 */
export const clearCartForEvent = (eventId: string, source: string = 'unknown') => {
  console.log(`🛒 ${source}: Attempting to clear cart for event:`, eventId);
  
  try {
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    console.log(`🛒 ${source}: Current cart data:`, cartData);
    
    if (!cartData) {
      console.log(`🛒 ${source}: No cart data found in localStorage`);
      return false;
    }

    const cartState = JSON.parse(cartData);
    console.log(`🛒 ${source}: Cart state before clearing:`, cartState);
    
    if (!cartState[eventId]) {
      console.log(`🛒 ${source}: No cart data found for event:`, eventId);
      return false;
    }

    // Remove the event from cart
    delete cartState[eventId];
    console.log(`🛒 ${source}: Cart state after deleting event:`, cartState);
    
    // Update or remove cart storage
    if (Object.keys(cartState).length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log(`🛒 ${source}: Removed entire cart storage (was empty)`);
    } else {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
      console.log(`🛒 ${source}: Updated cart storage:`, cartState);
    }
    
    // Dispatch update event
    window.dispatchEvent(new Event('cartUpdated'));
    console.log(`🛒 ${source}: Cart cleared successfully for event:`, eventId);
    
    return true;
  } catch (error) {
    console.error(`🛒 ${source}: Error clearing cart:`, error);
    return false;
  }
};

/**
 * Clear all carts
 * @param source - Source of the clearing for debugging
 */
export const clearAllCarts = (source: string = 'unknown') => {
  console.log(`🛒 ${source}: Clearing all carts`);
  
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
    console.log(`🛒 ${source}: All carts cleared successfully`);
    return true;
  } catch (error) {
    console.error(`🛒 ${source}: Error clearing all carts:`, error);
    return false;
  }
};

/**
 * Get current cart data
 * @returns Cart data object or null
 */
export const getCartData = () => {
  try {
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : null;
  } catch (error) {
    console.error('Error getting cart data:', error);
    return null;
  }
};

/**
 * Check if cart has items for a specific event
 * @param eventId - The event ID to check
 * @returns boolean indicating if cart has items for the event
 */
export const hasCartItems = (eventId: string): boolean => {
  const cartData = getCartData();
  if (!cartData || !cartData[eventId]) return false;
  
  return Object.values(cartData[eventId]).some((qty: any) => qty > 0);
};

/**
 * Test function for debugging cart clearing
 * Call from browser console: window.testCartClearing('eventId')
 */
export const testCartClearing = (eventId: string) => {
  console.log('🧪 Testing cart clearing for event:', eventId);
  console.log('🧪 Cart before clearing:', getCartData());
  
  const result = clearCartForEvent(eventId, 'Test');
  
  console.log('🧪 Clearing result:', result);
  console.log('🧪 Cart after clearing:', getCartData());
  
  return result;
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testCartClearing = testCartClearing;
  (window as any).getCartData = getCartData;
  (window as any).clearCartForEvent = clearCartForEvent;
}
