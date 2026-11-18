import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAttributionSearch } from '../../utils/referralStorage';

/**
 * Captures ?r=CODE on any route. ?ref= is still accepted as an alias.
 * Last click wins and is kept for 30 days.
 */
export default function ReferralQueryCapture() {
  const location = useLocation();

  useEffect(() => {
    captureAttributionSearch(location.search);
  }, [location.search]);

  return null;
}
