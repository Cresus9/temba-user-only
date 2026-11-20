import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAttributionSearch } from '../../utils/referralStorage';

/**
 * Captures ?r=CODE on any route. ?ref= is still accepted as an alias.
 * Last click wins. An event URL stores the event so the code is only
 * applied to that event. The code is cleared after a paid order.
 */
export default function ReferralQueryCapture() {
  const location = useLocation();

  useEffect(() => {
    captureAttributionSearch(location.search, Date.now(), location.pathname);
  }, [location.search, location.pathname]);

  return null;
}
