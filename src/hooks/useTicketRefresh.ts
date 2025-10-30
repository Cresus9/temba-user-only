import { useEffect, useState } from 'react';

/**
 * Hook to listen for ticket refresh events
 * Useful for components that display ticket data to refresh when transfers occur
 */
export function useTicketRefresh() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    // Listen for custom ticket refresh events
    window.addEventListener('tickets-refreshed', handleRefresh);

    return () => {
      window.removeEventListener('tickets-refreshed', handleRefresh);
    };
  }, []);

  return refreshTrigger;
}

/**
 * Hook to trigger ticket refresh
 * Useful for components that need to refresh ticket data after operations
 */
export function useTriggerTicketRefresh() {
  const triggerRefresh = () => {
    window.dispatchEvent(new CustomEvent('tickets-refreshed'));
  };

  return triggerRefresh;
}
